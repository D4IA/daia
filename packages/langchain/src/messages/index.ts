import z from "zod/v3";

export * from "./common";
export * from "./publicIdentity";
export * from "./offer";
export * from "./agreementReference";

import { DaiaPublicIdentityRequestSchema, DaiaPublicIdentityResponseSchema } from "./publicIdentity";
import { DaiaOfferMessageSchema } from "./offer";
import { DaiaAgreementReferenceMessageSchema } from "./agreementReference";

export const DaiaMessageSchema = z.union([
    DaiaPublicIdentityRequestSchema,
    DaiaPublicIdentityResponseSchema,
    DaiaOfferMessageSchema,
    DaiaAgreementReferenceMessageSchema,
]);

export type DaiaMessage = z.infer<typeof DaiaMessageSchema>;