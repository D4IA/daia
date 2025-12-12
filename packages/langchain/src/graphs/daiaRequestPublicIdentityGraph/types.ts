import z from "zod/v3"

export const DaiaRequestPublicIdentityStateSchema = z.object({
	publicKey: z.string(),
	responded: z.boolean(),
})

export type DaiaRequestPublicIdentityState = z.infer<typeof DaiaRequestPublicIdentityStateSchema>

export const DaiaRequestPublicIdentityStateInit: DaiaRequestPublicIdentityState = {
	publicKey: "",
	responded: false,
}

export type DaiaRequestPublicIdentityGraphOpts = {
	/**
	 * Vertex to go to after handling the request.
	 */
	onRequestPerformed: string
}
