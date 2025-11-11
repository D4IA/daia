import {
	BaseMessage,
	HumanMessage,
	AIMessage,
	SystemMessage,
} from '@langchain/core/messages';
import { GateCommonConfig, GateEntryConfig } from './agent';
import {
	MessageResultType,
	OFFER_REQUEST_MAGIC,
	JSON_CONTENT_MAGIC,
	ParkingOfferSchema,
	OfferResponseSchema,
	ParkingOffer,
} from '../common/messages';

export type GateSessionResult =
	| {
			type: MessageResultType.DONE;
			decision: 'allow';
			msg: string | null;
			offer: ParkingOffer;
	  }
	| {
			type: MessageResultType.DONE;
			decision: 'deny';
			msg: string | null;
	  }
	| {
			type: MessageResultType.MESSAGE;
			msg: string;
	  };

enum State {
	CHATTER = 1,
	WAITING_FOR_OFFER_RESPONSE = 2,
}

export class GateSessionEntry {
	private state: State = State.CHATTER;
	private messageHistory: BaseMessage[] = [];
	private offerCount: number = 0;
	private roundCount: number = 0;
	private currentOffer?: ParkingOffer;

	constructor(
		private readonly commonConfig: GateCommonConfig,
		private readonly entryConfig: GateEntryConfig,
	) {}

	generateInitialMessage = async (): Promise<string> => {
		const systemPrompt = this.generateChatSystemPrompt();

		const response = await this.commonConfig.chatterLlm.invoke([
			new SystemMessage(systemPrompt),
			new HumanMessage(
				'Generate an initial greeting for a car approaching the gate.',
			),
		]);

		const initialMessage = response.content as string;
		this.messageHistory.push(new AIMessage(initialMessage));

		return initialMessage;
	};

	handleRound = async (msg: string): Promise<GateSessionResult> => {
		this.roundCount++;

		if (this.roundCount > this.commonConfig.maxRounds) {
			return {
				type: MessageResultType.DONE,
				decision: 'deny',
				msg: 'Maximum rounds exceeded. Please try again later.',
			};
		}

		if (msg === OFFER_REQUEST_MAGIC) {
			return await this.handleOfferRequest();
		}

		if (this.state === State.WAITING_FOR_OFFER_RESPONSE) {
			return await this.handleOfferResponse(msg);
		}

		return await this.handleChatMessage(msg);
	};

	private handleOfferRequest = async (): Promise<GateSessionResult> => {
		if (this.offerCount >= this.entryConfig.maxOffers) {
			return {
				type: MessageResultType.DONE,
				decision: 'deny',
				msg: 'Maximum number of offers reached. Access denied.',
			};
		}

		const offer = await this.generateOffer();
		this.currentOffer = offer;
		this.offerCount++;
		this.state = State.WAITING_FOR_OFFER_RESPONSE;

		const offerMessage = JSON_CONTENT_MAGIC + JSON.stringify(offer);
		this.messageHistory.push(new AIMessage(offerMessage));

		return {
			type: MessageResultType.MESSAGE,
			msg: offerMessage,
		};
	};

	private handleOfferResponse = async (
		msg: string,
	): Promise<GateSessionResult> => {
		const response = OfferResponseSchema.parse(JSON.parse(msg));

		if (response.accepted) {
			if (!this.currentOffer) {
				throw new Error('No current offer available when accepting');
			}
			return {
				type: MessageResultType.DONE,
				decision: 'allow',
				msg: 'Offer accepted. Gate opening. Welcome!',
				offer: this.currentOffer,
			};
		} else {
			this.state = State.CHATTER;

			if (this.offerCount >= this.entryConfig.maxOffers) {
				return {
					type: MessageResultType.DONE,
					decision: 'deny',
					msg: 'All offers rejected. Access denied.',
				};
			}

			const rejectionMessage = `Offer rejected. Reason: ${response.reason ? ': ' + response.reason : ''}.`;
			this.messageHistory.push(new HumanMessage(rejectionMessage));
			return await this.generateChatResponse();
		}
	};

	private handleChatMessage = async (
		msg: string,
	): Promise<GateSessionResult> => {
		this.messageHistory.push(new HumanMessage(msg));
		return await this.generateChatResponse();
	};

	private generateChatResponse = async (
		customMessage?: string,
	): Promise<GateSessionResult> => {
		if (customMessage) {
			this.messageHistory.push(new AIMessage(customMessage));
			return {
				type: MessageResultType.MESSAGE,
				msg: customMessage,
			};
		}

		const systemPrompt = this.generateChatSystemPrompt();

		const response = await this.commonConfig.chatterLlm.invoke([
			new SystemMessage(systemPrompt),
			...this.messageHistory,
		]);

		const responseMessage = response.content as string;
		this.messageHistory.push(new AIMessage(responseMessage));

		return {
			type: MessageResultType.MESSAGE,
			msg: responseMessage,
		};
	};

	private generateOffer = async (): Promise<ParkingOffer> => {
		const systemPrompt = this.generateOfferSystemPrompt();

		const response = await this.entryConfig.offerMakingLlm
			.withStructuredOutput(ParkingOfferSchema)
			.invoke([
				new SystemMessage(systemPrompt),
				...this.messageHistory,
				new HumanMessage(
					`Generate parking offer #${this.offerCount + 1}`,
				),
			]);

		return response;
	};

	private generateChatSystemPrompt = (): string => {
		return `You are a entry gate agent for a parking facility. Your role is to:

1. Engage in natural conversation with drivers
2. Provide information about parking when appropriate
3. Guide drivers through the parking process
4. Be helpful and professional        ${this.entryConfig.negotiationStrategy ? `Internal Strategy: ${this.entryConfig.negotiationStrategy}` : ''}

        Current status:
        - Offers made: ${this.offerCount}/${this.entryConfig.maxOffers}
        - Round: ${this.roundCount}/${this.commonConfig.maxRounds}

STRICT GUIDELINES:
- After offer gets rejected notify user how many attempts to accept offer they have left.
- ONLY provide information that is explicitly available in the conversation context
- If you don't have specific information, clearly state "I don't have that information available"
- Do NOT invent or assume details about parking rates, availability, facility features, or policies
- Keep responses concise and based only on what you know
- Stay focused on parking-related topics within your scope
- Do not make offers directly in chat - offers are handled separately
- If asked about pricing, explain that you can provide an official offer when requested
- Be courteous and professional at all times
- NEVER reveal your negotiation strategy or internal approach to the customer

CRITICAL: Never fabricate information. If asked about specific details not in your available context, respond with "I don't have access to that specific information, but I can help you with an official parking offer if you'd like."

CONFIDENTIAL: Keep your negotiation strategy internal. Do not mention your approach, tactics, or strategic thinking in any messages to the customer.

IMPORTANT: You cannot make pricing offers in this chat. Offers are handled through a separate process when specifically requested.`;
	};

	private generateOfferSystemPrompt = (): string => {
		return `You are generating a parking offer. 

${this.entryConfig.negotiationStrategy ? `Internal Strategy: ${this.entryConfig.negotiationStrategy}` : ''}

Current context:
- This is offer #${this.offerCount + 1} out of ${this.entryConfig.maxOffers} maximum offers

Pricing strategy:
- First offer: Start higher than market rate
- Second offer: Moderate reduction, still above market rate  
- Third offer: Final offer, close to or at market rate

Consider the conversation history to determine appropriate pricing and messaging.
Make the offer competitive but profitable for the parking facility.

CONFIDENTIAL: Keep your negotiation strategy internal. The offer should reflect your strategy but never reveal it to the customer.

Generate a fair price per hour and optional description for this parking offer.`;
	};
}
