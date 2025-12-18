import z from "zod/v3";
import { DaiaMessageType } from "./common";

export const DaiaPublicIdentityRequestSchema = z.object({
	type: z.literal(DaiaMessageType.PUBLIC_IDENTITY_REQUEST),
});

export type DaiaPublicIdentityRequest = z.infer<typeof DaiaPublicIdentityRequestSchema>;

export const DaiaPublicIdentityResponseSchema = z.object({
	type: z.literal(DaiaMessageType.PUBLIC_IDENTITY_RESPONSE),
	publicKey: z.string(),
});

export type DaiaPublicIdentityResponse = z.infer<typeof DaiaPublicIdentityResponseSchema>;
