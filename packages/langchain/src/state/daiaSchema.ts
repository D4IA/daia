import { z } from "zod/v3"
import { DaiaProcessStateSchema } from "../graphs/daiaOfferProcessGraph"
import { DaiaInputStateSchema, DaiaOutputStateSchema, DaiaRemotePublicKeyStateSchema, defaultOutputState } from "../graphs/common"
import { DaiaRouterStateSchema } from "../graphs/daiaRouterGraph/types"
import { DaiaRequestPublicIdentityStateSchema } from "../graphs/daiaRequestPublicIdentityGraph"
import { DaiaResponsePublicIdentityStateSchema } from "../graphs/daiaResponsePublicIdentityGraph"
import { DaiaOfferGenerationStateSchema } from "../graphs/daiaOfferGenerationGraph"

const DaiaGenerationStateSchema = z.object({
	daiaMessage: z.string().optional(),
})

export type DaiaGenerationState = z.infer<typeof DaiaGenerationStateSchema>

export const DaiaGenerationStateInit: DaiaGenerationState = {}

export const DaiaStateSchema = z.object({
	input: DaiaInputStateSchema,
	output: DaiaOutputStateSchema,
	remotePublicKey: DaiaRemotePublicKeyStateSchema,

	router: DaiaRouterStateSchema,
	process: DaiaProcessStateSchema,
	requestPublicIdentity: DaiaRequestPublicIdentityStateSchema,
	responsePublicIdentity: DaiaResponsePublicIdentityStateSchema,
	offerGeneration: DaiaOfferGenerationStateSchema,
	generation: DaiaGenerationStateSchema,
})

export const DaiaStateNamespacedSchema = z.object({
	daia: DaiaStateSchema
})

export type DaiaStateNamespaced = z.infer<typeof DaiaStateNamespacedSchema>

export type DaiaStateUpdateNamespaced = {
	daia: Partial<DaiaState>
}

export type DaiaState = z.infer<typeof DaiaStateSchema>

import { defaultInputState, defaultRemotePublicKeyState } from "../graphs/common"
import { DaiaProcessStateInit } from "../graphs/daiaOfferProcessGraph"
import { DaiaRequestPublicIdentityStateInit } from "../graphs/daiaRequestPublicIdentityGraph"
import { DaiaResponsePublicIdentityStateInit } from "../graphs/daiaResponsePublicIdentityGraph"
import { DaiaRouterStateInit } from "../graphs/daiaRouterGraph/types"
import { DaiaOfferGenerationStateInit } from "../graphs/daiaOfferGenerationGraph"

export const DaiaStateInit: DaiaState = {
	output: defaultOutputState,
	input: defaultInputState,
	remotePublicKey: defaultRemotePublicKeyState,
	router: DaiaRouterStateInit,
	process: DaiaProcessStateInit,
	requestPublicIdentity: DaiaRequestPublicIdentityStateInit,
	responsePublicIdentity: DaiaResponsePublicIdentityStateInit,
	offerGeneration: DaiaOfferGenerationStateInit,
	generation: DaiaGenerationStateInit,
}

export const DaiaStateNamespacedInit: DaiaStateNamespaced = {
	daia: DaiaStateInit,
}
