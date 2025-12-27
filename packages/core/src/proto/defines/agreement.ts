import z from "zod/v3";
import { DaiaTransferOfferContentSchema } from "./offer";
import { DaiaOfferProofSchema } from "./requirement";

export const DaiaAgreementSchema = z.object({
	/**
	 * Offer content.
	 */
	offerContent: DaiaTransferOfferContentSchema,

	/**
	 * Map of requirement id to proof for that requirement.
	 */
	proofs: z.record(DaiaOfferProofSchema),
});

export type DaiaAgreement = z.infer<typeof DaiaAgreementSchema>;
