import { ChatOpenAI } from '@langchain/openai';
import { Conn, ConnHandler } from '../../conn';
import { CarSessionEntry } from './entrySessionHandler';
import { CarSessionExit } from './exitSessionHandler';
import { MessageResultType } from '../common/messages';
import {
	ProtoNegotiator,
	PortoNegotiatorRole,
} from '../common/negotiator/protoNegotiator';
import { CarControls } from './controls';

export interface CarCommonConfig {
	decisionLlm: ChatOpenAI;
	negotiationStrategy: string;
}

export interface CarEntryConfig {
	evaluationLlm: ChatOpenAI;
	maxPrice: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CarExitConfig {
	// Future exit-specific configuration can be added here
}

export interface CarAgentConfig {
	mode: 'entry' | 'exit';
	common: CarCommonConfig;
	entry: CarEntryConfig;
	exit: CarExitConfig;
}

export class CarAgent implements ConnHandler {
	constructor(
		private readonly controls: CarControls,
		private readonly config: CarAgentConfig,
	) {}

	handle = async (conn: Conn): Promise<void> => {
		// First, negotiate protocol
		const supportedProtocols =
			this.config.mode === 'entry' ? ['DAIA_1_ENTER'] : ['DAIA_1_EXIT'];
		const protoNegotiator = new ProtoNegotiator({
			role: PortoNegotiatorRole.PICKER,
			chatterLlm: this.config.common.decisionLlm,
			supportedProtocols: supportedProtocols,
		});

		const protoResult = await protoNegotiator.handleConn(conn);

		// Validate protocol matches mode
		const expectedProtocol =
			this.config.mode === 'entry' ? 'DAIA_1_ENTER' : 'DAIA_1_EXIT';
		if (protoResult.protocol !== expectedProtocol) {
			throw new Error(
				`Protocol mismatch: expected ${expectedProtocol} for ${this.config.mode} mode, got ${protoResult.protocol}`,
			);
		}

		// Create appropriate session based on mode
		const session =
			this.config.mode === 'entry'
				? new CarSessionEntry(this.controls, this.config)
				: new CarSessionExit(this.controls, this.config);

		// Wait for initial greeting from gate
		let currentMessage = await conn.receive();

		// Handle conversation rounds
		for (;;) {
			const result = await session.handleRound(currentMessage || '');

			if (result.type === MessageResultType.MESSAGE) {
				await conn.send(result.msg);

				// Wait for response
				currentMessage = await conn.receive();
				if (!currentMessage) break;
			} else if (result.type === MessageResultType.DONE) {
				// Send final response if there is one
				if (result.msg) {
					await conn.send(result.msg);
				}
				break;
			}
		}
	};
}
