import z from "zod/v3"

export const DaiaResponsePublicIdentityStateSchema = z.object({
	receivedPublicKey: z.string(),
	processed: z.boolean(),
})

export type DaiaResponsePublicIdentityState = z.infer<typeof DaiaResponsePublicIdentityStateSchema>

export const DaiaResponsePublicIdentityStateInit: DaiaResponsePublicIdentityState = {
	receivedPublicKey: "",
	processed: false,
}

export type DaiaResponsePublicIdentityGraphOpts = {
	/**
	 * Vertex to go to after handling the response.
	 */
	onResponseProcessed: string
}
