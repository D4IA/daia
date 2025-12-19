import z from "zod/v3";
import { DaiaOfferRequirementSchema } from "./requirement";

export const DaiaOfferContentSchema = z.object({
	offerTypeIdentifier: z.string(),

	naturalLanguageOfferContent: z.string(),

	/**
	 * Map of requirement id to requirement.
	 */
	requirements: z.record(DaiaOfferRequirementSchema),
});

export type DaiaOfferContent = z.infer<typeof DaiaOfferContentSchema>;
