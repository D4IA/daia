import { z } from 'zod';

// Common message types used across different agents
export enum MessageResultType {
	MESSAGE = 'MESSAGE',
	DONE = 'DONE',
}

// Magic strings for special message types
export const OFFER_REQUEST_MAGIC = '#@#@#__REQUEST_OFFER__#@#@#';
export const JSON_CONTENT_MAGIC =
	'#@#@#JSONf5b695bd-8188-4557-8ff0-d9ac5f4fc2de#@#@#';
export const REQUEST_PAYMENT_DATA_MAGIC = '#@#@#__PAYMENT_INSTRUCTION__#@#@#';
export const PAYMENT_CONFIRMATION_MAGIC = '#@#@#__PAYMENT_CONFIRMATION__#@#@#';

// Base result type for agent sessions
export type BaseSessionResult<T extends string = string> =
	| {
			type: MessageResultType.DONE;
			decision: T;
			msg: string | null;
	  }
	| {
			type: MessageResultType.MESSAGE;
			msg: string;
	  };

// Parking offer schema for structured output
export const ParkingOfferSchema = z.object({
	pricePerHour: z.number().positive().describe('The hourly rate for parking'),
	description: z
		.string()
		.nullable()
		.optional()
		.describe('Optional description of the offer'),
});

// Offer response schema
export const OfferResponseSchema = z.object({
	accepted: z.boolean().describe('Whether the offer was accepted'),
	reason: z
		.string()
		.nullable()
		.optional()
		.describe('Optional reason for acceptance or rejection'),
});

export type ParkingOffer = z.infer<typeof ParkingOfferSchema>;
export type OfferResponse = z.infer<typeof OfferResponseSchema>;

// Payment instruction schema
export const PaymentInstructionSchema = z.object({
	address: z.string().describe('The payment address or slot identifier'),
	amount: z.number().positive().describe('The amount to be paid'),
});

export type PaymentInstruction = z.infer<typeof PaymentInstructionSchema>;

// Payment confirmation schema
export const PaymentConfirmationSchema = z.object({
	paymentInstruction: PaymentInstructionSchema.describe(
		'The original payment instruction',
	),
	signature: z
		.string()
		.describe('Digital signature for payment verification'),
	timestamp: z.number().describe('Unix timestamp when payment was made'),
});

export type PaymentConfirmation = z.infer<typeof PaymentConfirmationSchema>;

// Payment with signature schema
export const PaymentWithSignatureSchema = z.object({
	paymentInstruction: PaymentInstructionSchema,
	signature: z.string(),
});

export type PaymentWithSignature = z.infer<typeof PaymentWithSignatureSchema>;
