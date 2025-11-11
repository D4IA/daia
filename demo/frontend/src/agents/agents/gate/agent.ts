import { Conn, ConnHandler } from '../../conn';
import { ChatOpenAI } from '@langchain/openai';
import { GateControls } from './controls';
import { GateSessionEntry } from './entrySessionHandler';
import { GateSessionExit } from './exitSessionHandler';
import { MessageResultType } from '../common/messages';
import {
	ProtoNegotiator,
	PortoNegotiatorRole,
} from '../common/negotiator/protoNegotiator';

export interface GateCommonConfig {
	chatterLlm: ChatOpenAI;
	maxRounds: number;
}

export interface GateEntryConfig {
	offerMakingLlm: ChatOpenAI;
	maxOffers: number;
	negotiationStrategy: string;
}

export interface GateExitConfig {
	paymentAddress: string;
}

export interface GateAgentConfig {
	common: GateCommonConfig;
	entry: GateEntryConfig;
	exit: GateExitConfig;
}

export class GateAgent implements ConnHandler {
	constructor(
		private readonly controls: GateControls,
		private readonly config: GateAgentConfig,
	) {}

	handle = async (conn: Conn): Promise<void> => {
		// First, negotiate protocol
		const protoNegotiator = new ProtoNegotiator({
			role: PortoNegotiatorRole.OFFERER,
			chatterLlm: this.config.common.chatterLlm,
			supportedProtocols: ['DAIA_1_ENTER', 'DAIA_1_EXIT'],
		});

		const protoResult = await protoNegotiator.handleConn(conn);

		if (protoResult.protocol === 'DAIA_1_ENTER') {
			await this.handleEntrySession(conn);
		} else if (protoResult.protocol === 'DAIA_1_EXIT') {
			await this.handleExitSession(conn);
		} else {
			throw new Error(
				'Unsupported protocol negotiated: ' + protoResult.protocol,
			);
		}
	};

	private handleEntrySession = async (conn: Conn): Promise<void> => {
		const session = new GateSessionEntry(
			this.config.common,
			this.config.entry,
		);

		// Send initial greeting
		await conn.send(await session.generateInitialMessage());

		// Handle conversation rounds
		for (;;) {
			const msg = await conn.receive();
			const result = await session.handleRound(msg);

			if (result.type === MessageResultType.MESSAGE) {
				await conn.send(result.msg);
			} else if (result.type === MessageResultType.DONE) {
				// Process the gate decision
				if (result.decision === 'allow') {
					// Read license plate and register the entry
					const licensePlate =
						this.controls.readRegistrationPlateEnterSide();
					const timestamp = new Date();
					const offer = result.offer;
					this.controls.registerCarEntry(
						licensePlate,
						offer,
						timestamp,
					);

					this.controls.letCarEnter();
				} else {
					this.controls.signalCarToLeave();
				}

				if (result.msg !== null) {
					await conn.send(result.msg);
				}
				break;
			}
		}
	};

	private handleExitSession = async (conn: Conn): Promise<void> => {
		// Read license plate to get parking offer and entry time
		const licensePlate = this.controls.readRegistrationPlateExitSide();
		const offerWithMetadata =
			this.controls.readOfferAndEntryTime(licensePlate);

		if (!offerWithMetadata) {
			throw new Error(
				'No parking record found for vehicle with license plate: ' +
					licensePlate,
			);
			return;
		}

		const session = new GateSessionExit(
			this.config.common,
			this.config.exit,
			this.controls,
			offerWithMetadata,
		);

		// Send initial greeting
		await conn.send(await session.generateInitialMessage());

		// Handle conversation rounds
		for (;;) {
			const msg = await conn.receive();
			const result = await session.handleRound(msg);

			if (result.type === MessageResultType.MESSAGE) {
				await conn.send(result.msg);
			} else if (result.type === MessageResultType.DONE) {
				if (result.msg !== null) {
					await conn.send(result.msg);
				}
				break;
			}
		}
	};
}
