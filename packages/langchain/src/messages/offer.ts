import z from "zod/v3";
import { DaiaOfferContentSchema } from "@daia/proto";
import { DaiaMessageType } from "./common";

export const DaiaOfferMessageSchema = z.object({
    type: z.literal(DaiaMessageType.OFFER),
    content: DaiaOfferContentSchema,
});

export type DaiaOfferMessage = z.infer<typeof DaiaOfferMessageSchema>;
