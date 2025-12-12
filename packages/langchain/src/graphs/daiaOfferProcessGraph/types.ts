import { DaiaAgreementSchema, DaiaOfferContent, OfferSignResponse } from "@daia/proto"
import z from "zod/v3"

export enum DaiaOfferCheckResultType {
	ACCEPT = "accept",
	REJECT = "reject"
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DaiaOfferCheckResultSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal(DaiaOfferCheckResultType.ACCEPT),
	}),
	z.object({
		type: z.literal(DaiaOfferCheckResultType.REJECT),
		rationale: z.string().optional(),
	}),
])

export type DaiaOfferCheckResult = z.infer<typeof DaiaOfferCheckResultSchema>

export const DaiaProcessStateSchema = z.object({
	agreement: z.discriminatedUnion("type", [
		z.object({
			type: z.literal(DaiaOfferCheckResultType.REJECT),
			rationale: z.string()
		}),
		z.object({
			type: z.literal(DaiaOfferCheckResultType.ACCEPT),
			agreement: DaiaAgreementSchema,
			agreementReference: z.string()
		})
	])
})

export type DaiaProcessState = z.infer<typeof DaiaProcessStateSchema>

export const DaiaProcessStateInit: DaiaProcessState = {
	agreement: {
		type: DaiaOfferCheckResultType.REJECT,
		rationale: "",
	},
}

export type DaiaOfferProcessGraphOpts = {
	/**
	 * Using current state, it generates offer.
	 */
	checkOffer: (state: DaiaOfferContent) => Promise<DaiaOfferCheckResult>

	/**
	 * Signing logic used to sign the offer.
	 */
	signer: (offer: DaiaOfferContent) => Promise<OfferSignResponse>

	/**
	 * Converts agreement into publishable form, which can be transmitted to the other side.
	 * 
	 * Usually it will just publish agreement on blockchain.
	 * 
	 * In some cases it can just serialize agreement as well.
	 */
	publisher: (agreement: OfferSignResponse) => Promise<string>

	/**
	 * Vertex to go to when offer was rejected.
	 */
	onReject: string

	/**
	 * Vertex to go to when offer was accepted.
	 */
	onAccept: string
}
