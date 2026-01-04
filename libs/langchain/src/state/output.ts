import { DaiaAgreementResponseSchema, DaiaTransferOfferContentSchema } from "@d4ia/core";
import z from "zod/v3";

export const DaiaLanggraphStateOutput = z.object({
	text: z.string(),
	remoteOffer: z.union([z.null(), DaiaTransferOfferContentSchema]),
	remoteResponseToLocalOffer: z.union([z.null(), DaiaAgreementResponseSchema]),
});
