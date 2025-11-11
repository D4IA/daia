import {
	AIMessage,
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from '@langchain/core/messages';
import {
	MessageResultType,
	PaymentInstruction,
	PaymentWithSignatureSchema,
	REQUEST_PAYMENT_DATA_MAGIC,
} from '../common/messages';
import { GateCommonConfig, GateExitConfig } from './agent';
import { GateControls, GateParkingOfferWithMetadata } from './controls';

export type GateSessionExitResult =
	| {
			type: MessageResultType.DONE;
			decision: 'allow';
			msg: string | null;
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
	PROCESSING_PAYMENT = 2,
}

export class GateSessionExit {
	private state: State = State.CHATTER;
	private messageHistory: BaseMessage[] = [];
	private roundCount: number = 0;

	private now = new Date();

	constructor(
		private readonly commonConfig: GateCommonConfig,
		private readonly exitConfig: GateExitConfig,
		private readonly controls: GateControls,
		private readonly offer: GateParkingOfferWithMetadata,
	) {}

	generateInitialMessage = async (): Promise<string> => {
		const systemPrompt = this.generateChatSystemPrompt();

		const response = await this.commonConfig.chatterLlm.invoke([
			new SystemMessage(systemPrompt),
			new HumanMessage(
				'Generate an initial greeting for a car approaching the exit gate. Tell client how long they were parking for and how much they need to pay.',
			),
		]);

		const initialMessage = response.text;
		this.messageHistory.push(new AIMessage(initialMessage));

		return initialMessage;
	};

	handleRound = async (msg: string): Promise<GateSessionExitResult> => {
		this.roundCount++;

		if (this.roundCount > this.commonConfig.maxRounds) {
			return {
				type: MessageResultType.DONE,
				decision: 'deny',
				msg: 'Maximum rounds exceeded. Please try again later.',
			};
		}

		if (msg === REQUEST_PAYMENT_DATA_MAGIC) {
			return await this.handleGetPaymentData();
		}

		if (this.state === State.CHATTER) {
			return await this.handleChatMessage(msg);
		} else if (this.state === State.PROCESSING_PAYMENT) {
			return await this.handlePaymentMsg(msg);
		} else {
			throw new Error(`Invalid state: ${this.state}`);
		}
	};

	private handlePaymentMsg = async (
		msg: string,
	): Promise<GateSessionExitResult> => {
		this.state = State.CHATTER;

		const paymentWithSignature = PaymentWithSignatureSchema.parse(
			JSON.parse(msg),
		);
		const isSignatureValid =
			this.verifyPaymentSignature(paymentWithSignature);
		return this.handlePaymentResult(isSignatureValid);
	};

	private handlePaymentResult = (
		isSignatureValid: boolean,
	): GateSessionExitResult => {
		if (isSignatureValid) {
			// Remove car entry from system
			const licensePlate = this.controls.readRegistrationPlateExitSide();
			this.controls.removeCarEntry(licensePlate);
			this.controls.letCarExit();

			return {
				type: MessageResultType.DONE,
				decision: 'allow',
				msg: 'Payment confirmed. Thank you! Gate opening for exit.',
			};
		} else {
			return {
				type: MessageResultType.DONE,
				decision: 'deny',
				msg: 'Payment verification failed. Please try again.',
			};
		}
	};

	private verifyPaymentSignature = (payment: {
		paymentInstruction: PaymentInstruction;
		signature: string;
	}): boolean => {
		// Mock signature verification logic
		console.log(
			`🔐 VERIFYING PAYMENT: Address: ${payment.paymentInstruction.address}, Amount: ${payment.paymentInstruction.amount}, Signature: ${payment.signature}`,
		);

		// Simple mock validation: signature should contain the amount and address
		const expectedSignature = `signed_${payment.paymentInstruction.address}_${payment.paymentInstruction.amount}`;
		const isValid = payment.signature === expectedSignature;

		console.log(
			`✅ Signature verification: ${isValid ? 'VALID' : 'INVALID'}`,
		);
		return isValid;
	};

	private handleGetPaymentData = async (): Promise<GateSessionExitResult> => {
		this.state = State.PROCESSING_PAYMENT;
		const details = this.getParkingDetails();

		const paymentInstruction = {
			address: this.exitConfig.paymentAddress,
			amount: details.parkingPrice,
		};

		const paymentMessage =
			REQUEST_PAYMENT_DATA_MAGIC + JSON.stringify(paymentInstruction);

		return {
			type: MessageResultType.MESSAGE,
			msg: paymentMessage,
		};
	};

	private handleChatMessage = async (
		msg: string,
	): Promise<GateSessionExitResult> => {
		this.messageHistory.push(new HumanMessage(msg));
		return await this.generateChatResponse();
	};

	private generateChatResponse = async (
		customMessage?: string,
	): Promise<GateSessionExitResult> => {
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

	private generateChatSystemPrompt = (): string => {
		const details = this.getParkingDetails();

		return `You are an exit gate agent for a parking facility. Your role is to:

1. Engage in natural conversation with drivers
2. Process parking payments and validate receipts
3. Guide drivers through the exit process
4. Be helpful and professional

Current status:
- Round: ${this.roundCount}/${this.commonConfig.maxRounds}

The client is required to pay $${details.parkingPrice} for ${details.timeHours} hours of parking based on the accepted offer of $${this.offer.offerData.pricePerHour} per hour.

STRICT GUIDELINES:
- ONLY provide information that is explicitly available in the conversation context
- If you don't have specific information, clearly state "I don't have that information available"
- Do NOT invent or assume details about parking rates, payment methods, or facility policies
- Keep responses concise and based only on what you know
- Stay focused on exit processing and payment-related topics
- Be courteous and professional at all times
- NEVER reveal your negotiation strategy or internal approach to the customer

CRITICAL: Never fabricate information. If asked about specific details not in your available context, respond with "I don't have access to that specific information, but I can help you process your exit."

IMPORTANT: Focus on helping customers complete their parking session and exit safely.`;
	};

	private readonly getParkingDetails = () => {
		const timeMillis = this.now.getTime() - this.offer.entryTime.getTime();

		const timeHours = timeMillis / (1000 * 60 * 60);
		const parkingPrice =
			Math.round(timeHours * this.offer.offerData.pricePerHour * 100) /
			100; // Round to 2 decimal places

		return {
			timeHours: Math.round(timeHours * 100) / 100, // Round to 2 decimal places
			parkingPrice,
		};
	};
}
