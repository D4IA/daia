import z from "zod/v3";
import { DaiaOfferProofSchema } from "./requirement";

export const DaiaAgreementSchema = z.object({
	/**
	 * Serialized offer content, so that signing it can be deterministic, as well as signature verification.
	 *
	 * @see DaiaOfferContentSchema
	 */
	offerContentSerialized: z.string(),
	/**
	 * Map of requirement id to proof for that requirement.
	 */
	proofs: z.record(DaiaOfferProofSchema),
});

export type DaiaAgreement = z.infer<typeof DaiaAgreementSchema>;
