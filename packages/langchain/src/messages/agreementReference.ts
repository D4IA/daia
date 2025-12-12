import z from "zod/v3";
import { DaiaMessageType } from "./common";

export enum DaiaAgreementReferenceResult {
    ACCEPT = "accept",
    REJECT = "reject",
}

export const DaiaAgreementReferenceMessageSchema = z.discriminatedUnion("result", [
    z.object({
        type: z.literal(DaiaMessageType.OFFER_RESPONSE),
        result: z.literal(DaiaAgreementReferenceResult.ACCEPT),
        agreementSerialized: z.string(),
    }),
    z.object({
        type: z.literal(DaiaMessageType.OFFER_RESPONSE),
        result: z.literal(DaiaAgreementReferenceResult.REJECT),
        rationale: z.string(),
    }),
]);

export type DaiaAgreementReferenceMessage = z.infer<typeof DaiaAgreementReferenceMessageSchema>;
