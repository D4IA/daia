import { DaiaOfferContentSchema } from "@daia/proto"
import z from "zod/v3"
import { DaiaPublicIdentityResponseSchema } from "../../messages/publicIdentity"

export type DaiaRouterOptions = {
	/**
	 * Vertex to go to when a Daia offer is detected.
	 */
	onDaiaOffer: string

	/**
	 * Vertex to go to when public identity request is detected.
	 */
	onPublicIdentityRequest: string

	/**
	 * Vertex to go to when public identity response is detected.
	 */
	onPublicIdentityResponse: string
	
	/**
	 * Vertex to go to when non-Daia input is detected.
	 */
	onNonDaiaInput: string
}

export const DaiaRouterStateSchema = z.object({
    inputText: z.string(),
    offerParsed: z.union([z.null(), DaiaOfferContentSchema]),
    publicIdentityResponseParsed: z.union([z.null(), DaiaPublicIdentityResponseSchema])
})

export type DaiaRouterState = z.infer<typeof DaiaRouterStateSchema>

export const DaiaRouterStateInit: DaiaRouterState = {
	inputText: "",
	offerParsed: null,
	publicIdentityResponseParsed: null,
}