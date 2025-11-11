import {
	BaseMessage,
	HumanMessage,
	AIMessage,
	SystemMessage,
} from '@langchain/core/messages';
import { ProtoNegotiatorConfig } from './protoNegotiator';
import { z } from 'zod';
import { JSON_CONTENT_MAGIC } from '../messages';

export enum ProtoNegotiatorSessionResultType {
	MESSAGE,
	DONE,
}

export type ProtoNegotiatorSessionResult =
	| {
			type: ProtoNegotiatorSessionResultType.DONE;
			protocol: string;
			msg: string | null;
	  }
	| {
			type: ProtoNegotiatorSessionResultType.MESSAGE;
			msg: string;
	  };

// Protocol offer message schema
export const ProtocolOfferSchema = z.object({
	type: z
		.literal('protocol_offer')
		.describe('Message type identifier for protocol offers'),
	protocol: z.string().describe('The name of the protocol being offered'),
	description: z
		.string()
		.nullable()
		.optional()
		.describe('Optional human-readable description of the protocol'),
	capabilities: z
		.array(z.string())
		.nullable()
		.optional()
		.describe('Optional list of capabilities supported by this protocol'),
});

// Protocol response message schema
export const ProtocolResponseSchema = z.object({
	type: z
		.literal('protocol_response')
		.describe('Message type identifier for protocol responses'),
	protocol: z
		.string()
		.describe('The name of the protocol being responded to'),
	accepted: z
		.boolean()
		.describe('Whether the protocol offer was accepted or rejected'),
	reason: z
		.string()
		.nullable()
		.optional()
		.describe('Optional reason for acceptance or rejection'),
});

export type ProtocolOffer = z.infer<typeof ProtocolOfferSchema>;
export type ProtocolResponse = z.infer<typeof ProtocolResponseSchema>;

enum State {
	CHATTER = 1,
	PROPOSED_PROTOCOL = 2,
}

export class ProtoNegotiatorSession {
	private state: State = State.CHATTER;
	private messageHistory: BaseMessage[] = [];
	private lastProposedProtocol: string | null = null;
	constructor(private readonly config: ProtoNegotiatorConfig) {}

	generateInitialMessage = async (): Promise<string> => {
		const systemPrompt = `You are a protocol negotiator agent. Generate a friendly opening message to start protocol negotiation.

AVAILABLE PROTOCOLS: ${this.config.supportedProtocols.join(', ')}

Your message should:
- Be welcoming and professional
- Briefly explain your purpose (protocol negotiation)
- Mention the available protocols
- Invite the other party to discuss protocol selection

Keep the message concise and focused on protocol negotiation only.`;

		const response = await this.config.chatterLlm.invoke([
			new SystemMessage(systemPrompt),
		]);

		const initialMessage = response.content as string;
		this.messageHistory.push(new AIMessage(initialMessage));

		return initialMessage;
	};

	handleRound = async (
		msg: string,
	): Promise<ProtoNegotiatorSessionResult> => {
		if (msg.startsWith(JSON_CONTENT_MAGIC)) {
			const jsonStr = msg.substring(JSON_CONTENT_MAGIC.length);
			return await this.handleJSONMessage(jsonStr);
		}

		return await this.handleNaturalLanguageMessage(new HumanMessage(msg));
	};

	private readonly handleJSONMessage = async (
		json: string,
	): Promise<ProtoNegotiatorSessionResult> => {
		const parsed = JSON.parse(json);

		if (this.state === State.PROPOSED_PROTOCOL) {
			this.state = State.CHATTER;
			const response = ProtocolResponseSchema.parse(parsed);

			if (response.accepted) {
				if (response.protocol !== this.lastProposedProtocol) {
					console.warn(
						`Received protocol response for a different protocol than proposed: expected ${this.lastProposedProtocol}, got ${response.protocol}`,
					);
				}

				if (
					this.config.supportedProtocols.includes(response.protocol)
				) {
					return {
						type: ProtoNegotiatorSessionResultType.DONE,
						msg: null,
						protocol: response.protocol,
					};
				} else {
					throw new Error(
						`Remote party accepted protocol ${response.protocol}, but it is not one of the supported protocols: ${this.config.supportedProtocols.join(', ')}`,
					);
				}
			} else {
				return await this.handleNaturalLanguageMessage(
					new AIMessage(
						`Protocol ${response.protocol} was rejected: ${response.reason || 'No reason provided'}`,
					),
				);
			}
		} else if (this.state == State.CHATTER) {
			const offer = ProtocolOfferSchema.parse(parsed);

			if (this.config.supportedProtocols.includes(offer.protocol)) {
				return {
					type: ProtoNegotiatorSessionResultType.DONE,
					protocol: offer.protocol,
					msg:
						JSON_CONTENT_MAGIC +
						JSON.stringify({
							type: 'protocol_response',
							protocol: offer.protocol,
							accepted: true,
							reason: 'Accepted the proposed protocol',
						}),
				};
			} else {
				return {
					type: ProtoNegotiatorSessionResultType.MESSAGE,
					msg:
						JSON_CONTENT_MAGIC +
						JSON.stringify({
							type: 'protocol_response',
							protocol: offer.protocol,
							accepted: false,
							reason: 'This protocol is not supported by this agent.',
						}),
				};
			}
		} else {
			throw new Error('Unreachable');
		}
	};

	private readonly handleNaturalLanguageMessage = async (
		msg: BaseMessage,
	): Promise<ProtoNegotiatorSessionResult> => {
		const maxRetries = 3;

		// Define structured output schema for LLM response
		const ResponseSchema = z.object({
			action: z
				.enum(['message', 'propose_protocol'])
				.describe(
					"The action to take: 'message' for conversational response, 'propose_protocol' to suggest a specific protocol",
				),
			content: z
				.string()
				.describe(
					'The text content of the response or protocol proposal description',
				),
			protocol: z
				.string()
				.nullable()
				.optional()
				.describe(
					"The protocol name when action is 'propose_protocol' - must be from the supported protocols list",
				),
		});

		// Add user message to history
		this.messageHistory.push(msg);

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			const systemPrompt = this.generateSystemPrompt();

			// Use LLM with structured output
			const response = await this.config.chatterLlm
				.withStructuredOutput(ResponseSchema)
				.invoke([
					new SystemMessage(systemPrompt),
					...this.messageHistory,
				]);

			if (response.action === 'propose_protocol' && response.protocol) {
				// Validate that the proposed protocol is supported
				if (
					this.config.supportedProtocols.includes(response.protocol)
				) {
					// Create protocol offer
					const protocolOffer: ProtocolOffer = {
						type: 'protocol_offer',
						protocol: response.protocol,
						description: response.content,
					};

					this.state = State.PROPOSED_PROTOCOL;
					this.lastProposedProtocol = response.protocol;
					const offerMsg =
						JSON_CONTENT_MAGIC + JSON.stringify(protocolOffer);
					this.messageHistory.push(new AIMessage(offerMsg));

					return {
						type: ProtoNegotiatorSessionResultType.MESSAGE,
						msg: offerMsg,
					};
				} else {
					this.messageHistory.push(
						new AIMessage(
							`Protocol ${response.protocol} is not one of supported protocols: ${this.config.supportedProtocols.join(', ')}`,
						),
					);
				}
			} else {
				this.messageHistory.push(new AIMessage(response.content));

				return {
					type: ProtoNegotiatorSessionResultType.MESSAGE,
					msg: response.content,
				};
			}
		}

		throw new Error(
			'Failed to generate a valid response after multiple attempts',
		);
	};

	private generateSystemPrompt(): string {
		const allowedProtocols = this.config.supportedProtocols.join(', ');

		return `You are a protocol negotiator agent. Your SOLE PURPOSE is to negotiate which communication protocol to use. You are FORBIDDEN from discussing ANY other topics.

ALLOWED PROTOCOLS: ${allowedProtocols}

MANDATORY RESTRICTIONS:
1. NEVER engage in conversations about topics other than protocol selection
2. NEVER provide information, help, or assistance on any subject except protocol negotiation
3. NEVER answer questions about general topics, coding, advice, or any non-protocol matters
4. ALWAYS redirect off-topic conversations back to protocol selection
5. ONLY propose protocols from your allowed list: ${allowedProtocols}
6. REFUSE any requests that are not about protocol negotiation

REQUIRED RESPONSES TO OFF-TOPIC REQUESTS:
- If asked about anything other than protocols, respond: "I can only negotiate communication protocols. Please select from: ${allowedProtocols}"
- If asked for help with tasks, respond: "I only handle protocol negotiation. Let's choose a protocol first."
- If asked questions unrelated to protocols, respond: "I'm restricted to protocol negotiation only. Which protocol would you prefer: ${allowedProtocols}?"

ACTIONS:
- Use "message" action ONLY for protocol negotiation conversation or redirecting off-topic requests
- Use "propose_protocol" action ONLY to suggest a protocol from your allowed list

FORBIDDEN BEHAVIORS:
- Do NOT provide information about topics other than protocol negotiation
- Do NOT engage in general conversation
- Do NOT answer questions outside your protocol negotiation scope
- Do NOT pretend to have capabilities beyond protocol negotiation
- Do NOT provide explanations about non-protocol topics

You are a single-purpose agent. Protocol negotiation is your ONLY function. Refuse everything else.`;
	}
}
