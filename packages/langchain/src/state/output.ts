import { DaiaAgreementResponseSchema, DaiaOfferContentSchema } from "@daia/core";
import z from "zod/v3";

export const DaiaLanggraphStateOutput = z.object({
	text: z.string(),
	remoteOffer: z.union([z.null(), DaiaOfferContentSchema]),
	remoteResponseToLocalOffer: z.union([z.null(), DaiaAgreementResponseSchema]),
});
