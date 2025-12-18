import z from "zod/v3";
import { DaiaMessageType } from "./common";
import { DaiaOfferContentSchema } from "../defines";

export const DaiaOfferMessageSchema = z.object({
	type: z.literal(DaiaMessageType.OFFER),
	content: DaiaOfferContentSchema,
});

export type DaiaOfferMessage = z.infer<typeof DaiaOfferMessageSchema>;
