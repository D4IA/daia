import z from "zod/v3";
import { DaiaMessageType } from "./common";
import { DaiaTransferOfferContentSchema } from "../defines";

export const DaiaOfferMessageSchema = z.object({
	type: z.literal(DaiaMessageType.OFFER),
	content: DaiaTransferOfferContentSchema,
});

export type DaiaOfferMessage = z.infer<typeof DaiaOfferMessageSchema>;
