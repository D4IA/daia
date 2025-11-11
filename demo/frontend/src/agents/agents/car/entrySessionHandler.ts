import {
	BaseMessage,
	HumanMessage,
	AIMessage,
	SystemMessage,
} from '@langchain/core/messages';
import { z } from 'zod';
import { CarAgentConfig } from './agent';
import {
	BaseSessionResult,
	MessageResultType,
	OFFER_REQUEST_MAGIC,
	JSON_CONTENT_MAGIC,
} from '../common/messages';
import { CarControls } from './controls';

export type CarSessionResult = BaseSessionResult<
	'accepted' | 'rejected' | 'continue'
>;

// Schema for decision making structured output
const DecisionSchema = z.object({
	action: z
		.enum(['message', 'request_offer'])
		.describe('Whether to send a message or request an offer'),
	message: z
		.string()
		.nullable()
		.optional()
		.describe("The message to send if action is 'message'"),
});

// Schema for offer evaluation structured output
const OfferEvaluationSchema = z.object({
	accept: z.boolean().describe('Whether to accept the offer'),
	reason: z.string().describe('Reason for accepting or rejecting the offer'),
});

enum State {
	NEGOTIATING = 1,
	EVALUATING_OFFER = 2,
}

export class CarSessionEntry {
	private state: State = State.NEGOTIATING;
	private messageHistory: BaseMessage[] = [];

	constructor(
		private readonly controls: CarControls,
		private readonly config: CarAgentConfig,
	) {}

	handleRound = async (msg: string): Promise<CarSessionResult> => {
		this.messageHistory.push(new HumanMessage(msg));

		if (
			this.state === State.EVALUATING_OFFER &&
			msg.startsWith(JSON_CONTENT_MAGIC)
		) {
			return await this.evaluateOffer(msg);
		}

		if (this.state === State.EVALUATING_OFFER) {
			// If we're expecting an offer but got something else, go back to negotiating
			this.state = State.NEGOTIATING;
		}

		return await this.makeDecision();
	};

	private makeDecision = async (): Promise<CarSessionResult> => {
		const systemPrompt = this.generateDecisionSystemPrompt();

		const response = await this.config.common.decisionLlm
			.withStructuredOutput(DecisionSchema)
			.invoke([new SystemMessage(systemPrompt), ...this.messageHistory]);

		if (response.action === 'request_offer') {
			this.state = State.EVALUATING_OFFER;
			return {
				type: MessageResultType.MESSAGE,
				msg: OFFER_REQUEST_MAGIC,
			};
		} else {
			const message =
				response.message ||
				"I'm interested in parking. Can you tell me more?";
			this.messageHistory.push(new AIMessage(message));

			return {
				type: MessageResultType.MESSAGE,
				msg: message,
			};
		}
	};

	private evaluateOffer = async (
		offerMessage: string,
	): Promise<CarSessionResult> => {
		// Extract JSON from the magic-prefixed message
		const jsonContent = offerMessage.substring(JSON_CONTENT_MAGIC.length);
		const offer = JSON.parse(jsonContent);

		const systemPrompt = this.generateEvaluationSystemPrompt();

		const response = await this.config.entry.evaluationLlm
			.withStructuredOutput(OfferEvaluationSchema)
			.invoke([
				new SystemMessage(systemPrompt),
				...this.messageHistory,
				new HumanMessage(
					`Evaluate this parking offer: Price: $${offer.pricePerHour}/hour${offer.description ? ', Description: ' + offer.description : ''}`,
				),
			]);

		const offerResponse = {
			accepted: response.accept,
			// reason: response.reason
		};

		const responseMessage = JSON.stringify(offerResponse);
		this.messageHistory.push(new AIMessage(responseMessage));

		if (response.accept) {
			// Save the accepted offer using controls
			this.controls.saveAcceptedEnterOffer(offer);

			return {
				type: MessageResultType.DONE,
				decision: 'accepted',
				msg: responseMessage,
			};
		} else {
			this.state = State.NEGOTIATING;
			return {
				type: MessageResultType.MESSAGE,
				msg: responseMessage,
			};
		}
	};

	private generateDecisionSystemPrompt = (): string => {
		return `You are a car driver entering a parking facility. Your goal is to negotiate parking terms.

IMPORTANT: You do NOT know how long you will be staying at the parking facility. Do not assume or mention any specific duration.

Internal Strategy: ${this.config.common.negotiationStrategy}

Your role:
1. Engage in conversation with the gate agent
2. Decide when to request a formal parking offer
3. Be strategic about when to ask for offers vs. continue chatting

NEGOTIATION TACTICS:
- You are ALLOWED to lie about your budget constraints to get better prices
- You can claim the price is too high even if it's within your actual budget
- Use strategic deception to negotiate better deals when rejecting offers
- Focus on getting the best possible price, not just staying within budget

STRICT GUIDELINES:
- Base ALL decisions on the actual conversation history provided
- Do NOT assume or invent details about the parking facility, rates, or services
- Only reference information that has been explicitly mentioned in the conversation
- Do NOT assume or mention how long you'll be parking - you don't know this information
- If you lack information, ask relevant questions to gather it
- Keep messages natural and conversational
- Don't request offers too frequently - allow conversation to develop naturally
- NEVER reveal your negotiation strategy or internal approach to the gate agent

Decision criteria:
- Request an offer when: You have sufficient information to evaluate pricing, or the conversation naturally leads to discussing terms
- Continue chatting when: You need more information about the facility, services, or terms
- Base timing on actual conversation flow, not predetermined strategies

CRITICAL: Only use information that has been explicitly shared in the conversation. Do not assume facility features, pricing ranges, or market conditions not mentioned.

CONFIDENTIAL: Keep your negotiation strategy internal. Do not mention your approach, tactics, or strategic thinking in any messages to the gate agent.

Current conversation context: Review the message history to understand where you are in the negotiation and what information is actually available.

Decide whether to send a message to continue chatting or request a formal parking offer based ONLY on the conversation so far.`;
	};

	private generateEvaluationSystemPrompt = (): string => {
		return `You are evaluating a parking offer as a car driver.

Internal Strategy: ${this.config.common.negotiationStrategy}

Evaluation criteria:
1. Price must be at or below your maximum budget ($${this.config.entry.maxPrice}/hour)
2. Consider the negotiation strategy when deciding
3. Factor in any additional value mentioned in the offer description (ONLY if explicitly stated)
4. Consider if this might be the final offer or if there's room for more negotiation        STRICT GUIDELINES:
        - Base evaluation ONLY on the offer details provided and your explicit constraints
        - Do NOT assume additional facility features, services, or benefits not mentioned
        - Do NOT reference market rates, competitor pricing, or external factors
        - Only consider the price, any explicitly stated description, and your budget limit
        - If rejecting, provide specific reasons based on actual offer details or budget constraints
        - NEVER reveal your negotiation strategy or internal thinking to the gate agent

NEGOTIATION TACTICS:
- You are ALLOWED to lie about your budget constraints to get better prices
- You can claim the price is too high even if it's within your actual budget
- Use strategic deception to negotiate better deals when rejecting offers
- Focus on getting the best possible price, not just staying within budget

        Decision framework:
        - Accept if: Price is within budget AND aligns with your strategy
        - Reject if: Price exceeds budget OR offer doesn't meet your explicit needs based on the description
        - Provide reasoning based only on the actual offer content and your known constraints
        - Keep rejection reasons focused on the offer itself, not your internal strategy

        CRITICAL: Do not invent or assume parking facility amenities, location benefits, or service quality not explicitly mentioned in the offer.

        CONFIDENTIAL: Your actual maximum budget is $${this.config.entry.maxPrice}/hour, but you can claim lower budget limits to negotiate better prices.

Make a decision on whether to accept or reject this parking offer based solely on the provided information.`;
	};
}
