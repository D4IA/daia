import { DaiaOfferContent } from "@daia/proto"
import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { produce } from "immer"
import { DaiaStateNamespaced, DaiaStateNamespacedSchema } from "../../state"
import { DaiaOfferCheckResultType, DaiaOfferProcessGraphOpts } from "./types"
import { DaiaMessageUtils } from "../../utils/daia"
import { DaiaAgreementReferenceResult, DaiaMessageType } from "../../messages"

export const makeDaiaOfferProcessGraph = (opts: DaiaOfferProcessGraphOpts) => {
	return new StateGraph(DaiaStateNamespacedSchema)
		.addNode("process", async (state: Readonly<DaiaStateNamespaced>) => {
			const offer: DaiaOfferContent | null = state.daia.router.offerParsed
			if (!offer) {
				throw new Error("Offer was not loaded from user input yet")
			}

			const checkResult = await opts.checkOffer(offer)

			if (checkResult.type === DaiaOfferCheckResultType.REJECT) {
				return new Command({
					update: produce(state, draft => {
						draft.daia.process.agreement = {
							type: DaiaOfferCheckResultType.REJECT,
							rationale: checkResult.rationale ?? "",
						}
						draft.daia.output.outputText = DaiaMessageUtils.serialize({
							type: DaiaMessageType.OFFER_RESPONSE,
							result: DaiaAgreementReferenceResult.REJECT,
							rationale: checkResult.rationale ?? "",
						})
					}),
					goto: opts.onReject,
					graph: Command.PARENT,
				})
			}

			const agreement = await opts.signer(offer)
			const agreementRef = await opts.publisher(agreement)

			return new Command({
				update: produce(state, draft => {
					draft.daia.process.agreement = {
						type: DaiaOfferCheckResultType.ACCEPT,
						agreement: agreement.agreement,
						agreementReference: agreementRef
					}
					draft.daia.output.outputText = DaiaMessageUtils.serialize({
						type: DaiaMessageType.OFFER_RESPONSE,
						result: DaiaAgreementReferenceResult.ACCEPT,
						agreementSerialized: agreementRef,
					})
				}),
				goto: opts.onAccept,
				graph: Command.PARENT,
			})
		}, {
			ends: [opts.onAccept, opts.onAccept],
		})
		.addEdge(START, "process")
		.addEdge("process", END)
		.compile()
}
