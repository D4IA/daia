import { ChatOpenAI } from '@langchain/openai';
import { Conn } from '../../../conn';
import {
	ProtoNegotiatorSession,
	ProtoNegotiatorSessionResultType,
} from './protoNegotiatorSession';

export enum PortoNegotiatorRole {
	OFFERER = 'offerer',
	PICKER = 'picker',
}

export type ProtoNegotiatorConfig = {
	role: PortoNegotiatorRole;
	chatterLlm: ChatOpenAI;
	supportedProtocols: string[];
};

export type ProtoNegotiatorResult = {
	protocol: string;
};

export class ProtoNegotiator {
	constructor(private readonly config: ProtoNegotiatorConfig) {}

	handleConn = async (conn: Conn): Promise<ProtoNegotiatorResult> => {
		const handler = new ProtoNegotiatorSession(this.config);

		if (this.config.role === PortoNegotiatorRole.OFFERER) {
			await conn.send(await handler.generateInitialMessage());
		}

		for (;;) {
			const msg = await conn.receive();
			const res = await handler.handleRound(msg);

			if (res.msg !== null) {
				await conn.send(res.msg);
			}

			if (res.type === ProtoNegotiatorSessionResultType.DONE) {
				return {
					protocol: res.protocol,
				};
			}
		}
	};
}
