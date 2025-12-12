import type { DaiaOfferContent } from "@daia/proto"
import z from "zod/v3"

export const DaiaOfferGenerationStateSchema = z.object({
	generated: z.boolean(),
})

export type DaiaOfferGenerationState = z.infer<typeof DaiaOfferGenerationStateSchema>

export const DaiaOfferGenerationStateInit: DaiaOfferGenerationState = {
	generated: false,
}

export type DaiaOfferGenerationGraphOpts = {
	/**
	 * Using current state, it generates offer.
	 */
	generateOffer: () => Promise<DaiaOfferContent>

	/**
	 * Where to direct flow to, once message is generated and saved as text response.
	 */
	onDone: string
}
