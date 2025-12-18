import { DaiaAgreementResponseSchema, DaiaOfferContentSchema } from "@daia/proto";
import z from "zod/v3";

export const DaiaLanggraphStateOutput = z.object({
	text: z.string(),
	remoteOffer: z.union([z.null(), DaiaOfferContentSchema]),
	remoteResponseToLocalOffer: z.union([z.null(), DaiaAgreementResponseSchema]),
});
