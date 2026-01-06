import z from "zod/v3";
import { DaiaMessageType } from "./common";
import { DaiaAgreementSchema } from "../defines";

export enum DaiaAgreementReferenceResult {
	ACCEPT = "accept",
	REJECT = "reject",
}

export const DaiaAgreementResponseSchema = z.discriminatedUnion("result", [
	z.object({
		result: z.literal(DaiaAgreementReferenceResult.ACCEPT),
		agreementReference: z.string(),
		agreement: DaiaAgreementSchema,
	}),
	z.object({
		result: z.literal(DaiaAgreementReferenceResult.REJECT),
		rationale: z.string(),
	}),
]);

export type DaiaAgreementResponse = z.infer<typeof DaiaAgreementResponseSchema>;

export const DaiaAgreementReferenceMessageSchema = z.discriminatedUnion("result", [
	z.object({
		type: z.literal(DaiaMessageType.OFFER_RESPONSE),
		result: z.literal(DaiaAgreementReferenceResult.ACCEPT),
		agreementReference: z.string(),
		agreement: DaiaAgreementSchema,
	}),
	z.object({
		type: z.literal(DaiaMessageType.OFFER_RESPONSE),
		result: z.literal(DaiaAgreementReferenceResult.REJECT),
		rationale: z.string(),
	}),
]);

export type DaiaAgreementReferenceMessage = z.infer<typeof DaiaAgreementReferenceMessageSchema>;
