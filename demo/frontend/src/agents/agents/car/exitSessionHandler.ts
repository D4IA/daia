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
	REQUEST_PAYMENT_DATA_MAGIC,
	PaymentInstruction,
	PaymentInstructionSchema,
} from '../common/messages';
import { CarControls } from './controls';
import { RoundHandler } from '../../conn/handler';

export type CarSessionExitResult = BaseSessionResult<
	'completed' | 'failed' | 'continue'
>;

// Schema for decision making structured output
const DecisionSchema = z.object({
	action: z
		.enum(['message', 'proceed_with_payment'])
		.describe('Whether to send a message or proceed with payment'),
	message: z
		.string()
		.nullable()
		.optional()
		.describe("The message to send if action is 'message'"),
});

enum State {
	CHATTER = 1,
	PROCESSING_PAYMENT = 2,
}

export class CarSessionExit implements RoundHandler<CarSessionExitResult> {
	private state: State = State.CHATTER;
	private messageHistory: BaseMessage[] = [];
	private roundCount: number = 0;

	constructor(
		private readonly controls: CarControls,
		private readonly config: CarAgentConfig,
	) {
		// Controls interface available for future use
		void this.controls;
	}

	handleRound = async (msg: string): Promise<CarSessionExitResult> => {
		this.roundCount++;
		this.messageHistory.push(new HumanMessage(msg));

		if (msg.startsWith(REQUEST_PAYMENT_DATA_MAGIC)) {
			return await this.handlePaymentRequest(msg);
		}

		if (this.state === State.PROCESSING_PAYMENT) {
			// If we're in payment state but didn't get payment data, go back to chatting
			this.state = State.CHATTER;
		}

		return await this.generateChatResponse();
	};

	private handlePaymentRequest = async (
		msg: string,
	): Promise<CarSessionExitResult> => {
		// Extract payment instruction from the message
		const paymentDataJson = msg.substring(
			REQUEST_PAYMENT_DATA_MAGIC.length,
		);
		const paymentInstruction = PaymentInstructionSchema.parse(
			JSON.parse(paymentDataJson),
		);

		this.state = State.PROCESSING_PAYMENT;

		// Generate payment with signature
		const paymentWithSignature =
			this.generatePaymentWithSignature(paymentInstruction);
		const paymentMessage = JSON.stringify(paymentWithSignature);

		this.messageHistory.push(new AIMessage(paymentMessage));

		return {
			type: MessageResultType.MESSAGE,
			msg: paymentMessage,
		};
	};

	private generatePaymentWithSignature = (
		paymentInstruction: PaymentInstruction,
	) => {
		// Mock payment signature generation - matches the verification logic in gate
		const signature = `signed_${paymentInstruction.address}_${paymentInstruction.amount}`;

		console.log(
			`💳 GENERATING PAYMENT: Address: ${paymentInstruction.address}, Amount: ${paymentInstruction.amount}, Signature: ${signature}`,
		);

		return {
			paymentInstruction,
			signature,
		};
	};

	private generateChatResponse = async (): Promise<CarSessionExitResult> => {
		const systemPrompt = this.generateChatSystemPrompt();

		const response = await this.config.common.decisionLlm
			.withStructuredOutput(DecisionSchema)
			.invoke([new SystemMessage(systemPrompt), ...this.messageHistory]);

		if (response.action === 'proceed_with_payment') {
			this.state = State.PROCESSING_PAYMENT;
			// Request payment data from the gate
			return {
				type: MessageResultType.MESSAGE,
				msg: REQUEST_PAYMENT_DATA_MAGIC,
			};
		} else {
			const message =
				response.message ||
				"I'm here to exit and pay any required fees.";
			this.messageHistory.push(new AIMessage(message));

			return {
				type: MessageResultType.MESSAGE,
				msg: message,
			};
		}
	};

	private generateChatSystemPrompt = (): string => {
		return `You are a car driver exiting a parking facility. Your goal is to complete the exit process by paying any required fees.

Internal Strategy: ${this.config.common.negotiationStrategy}

Your role:
1. Engage in natural conversation with the exit gate agent
2. Understand parking charges and payment requirements
3. Decide when to proceed with payment
4. Complete payment when requested
5. Follow instructions to exit the facility

Current status:
- Round: ${this.roundCount}
- State: ${this.state === State.CHATTER ? 'Conversing' : 'Processing Payment'}

DECISION CRITERIA:
- Send a message when: You need more information about charges, want to engage in conversation, or need clarification
- Proceed with payment when: The gate agent has provided parking charges and you're ready to pay, or when explicitly asked to pay

STRICT GUIDELINES:
- Base ALL responses on the actual conversation history provided
- Do NOT assume or invent details about parking duration, rates, or charges
- Only reference information that has been explicitly mentioned by the gate agent
- Be cooperative and willing to pay legitimate parking charges
- Ask for clarification if payment instructions are unclear
- Keep responses natural and conversational
- Be polite and professional throughout the exit process
- NEVER reveal your negotiation strategy or internal approach to the gate agent

PAYMENT BEHAVIOR:
- When payment is requested, comply promptly to complete the exit process
- Ask questions if payment details are unclear
- Acknowledge receipt of payment confirmation

CRITICAL: Only use information that has been explicitly shared in the conversation. Do not assume parking duration, charges, or facility policies not mentioned by the gate agent.

CONFIDENTIAL: Keep your internal strategy and approach private. Focus on completing the exit process efficiently.

Current conversation context: Review the message history to understand the current stage of the exit process and decide whether to send a message or proceed with payment.

Decide whether to send a message to continue chatting or proceed with payment based ONLY on the conversation so far.`;
	};
}
