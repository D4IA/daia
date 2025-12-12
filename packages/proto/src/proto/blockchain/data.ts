import z from "zod/v3";
import { DaiaAgreementSchema } from "../defines";

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

export type DaiaTransactionData = z.infer<typeof DaiaTransactionDataSchema>;
