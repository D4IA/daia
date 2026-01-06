import {
	DaiaAgreementReferenceResult,
	DaiaAgreementSchema,
	DaiaTransferOfferContentSchema,
} from "@d4ia/core";
import z from "zod/v3";

export enum DaiaLanggraphMethodId {
	SEND_OFFER = "send-offer",
}

export const DaiaLanggraphMethodCallSchema = z.discriminatedUnion("methodId", [
	z.object({
		methodId: z.literal(DaiaLanggraphMethodId.SEND_OFFER),
		offer: DaiaTransferOfferContentSchema,
	}),
]);

export type DaiaLanggraphMethodCall = z.infer<typeof DaiaLanggraphMethodCallSchema>;

export const DaiaLanggraphOfferResponseSchema = z.discriminatedUnion("result", [
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

export type DaiaLanggraphOfferResponse = z.infer<typeof DaiaLanggraphOfferResponseSchema>;

export const DaiaLanggraphStateInput = z.object({
	text: z.string(),
	methodCall: z.union([DaiaLanggraphMethodCallSchema, z.null()]),
	offerResponse: z.union([z.null(), DaiaLanggraphOfferResponseSchema]),
});
