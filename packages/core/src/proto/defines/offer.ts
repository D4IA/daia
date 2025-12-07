import z from "zod/v3";
import { DaiaOfferRequirementSchema } from "./requirement";

export const DaiaOfferSelfSignedDataSchema = z.object({
	signature: z.string(),
});

export const DaiaTransferOfferContentSchema = z.object({
	/**
	 * @see DaiaInnerOfferContent
	 */
	inner: z.string(),

	/**
	 * Map of requirement id to signature id for self-signed signature requirements.
	 */
	signatures: z.record(z.string(), DaiaOfferSelfSignedDataSchema),
});

export const DaiaInnerOfferContentSchema = z.object({
	offerTypeIdentifier: z.string(),

	naturalLanguageOfferContent: z.string(),

	/**
	 * Map of requirement id to requirement.
	 */
	requirements: z.record(DaiaOfferRequirementSchema),
});

export type DaiaInnerOfferContent = z.infer<typeof DaiaInnerOfferContentSchema>;
export type DaiaTransferOfferContent = z.infer<typeof DaiaTransferOfferContentSchema>;
export type DaiaOfferSelfSignedData = z.infer<typeof DaiaOfferSelfSignedDataSchema>;
