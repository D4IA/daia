import z from "zod/v3";
import { DaiaAgreementSchema } from "../defines";

/**
 * Describes what is the type of information, which is recognized by DAIA stored in blockchain transaction.
 */
export enum DaiaTransactionDataType {
	AGREEMENT = "agreement",
	PAYMENT_IDENTIFIER = "payment-identifier",
}

export const DaiaTransactionDataSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(DaiaTransactionDataType.AGREEMENT),
		agreement: DaiaAgreementSchema,
	}),
	z.object({
		type: z.literal(DaiaTransactionDataType.PAYMENT_IDENTIFIER),
		paymentNonce: z.string(),
	}),
]);

/**
 * Describes anything DAIA can store in blockchain transaction.
 */
export type DaiaTransactionData = z.infer<typeof DaiaTransactionDataSchema>;
