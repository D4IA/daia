import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { produce } from "immer"
import { DaiaStateNamespaced, DaiaStateNamespacedSchema } from "../../state"
import { DaiaOfferGenerationGraphOpts } from "./types"
import { DaiaMessageUtils } from "../../utils/daia"
import { DaiaMessageType } from "../../messages"

export const makeDaiaOfferGenerationGraph = (opts: DaiaOfferGenerationGraphOpts) => {
	return new StateGraph(DaiaStateNamespacedSchema)
		.addNode("generate", async (state: Readonly<DaiaStateNamespaced>) => {
			const offer = await opts.generateOffer()

			return new Command({
				update: produce(state, draft => {
					draft.daia.offerGeneration.generated = true
					draft.daia.output.outputText = DaiaMessageUtils.serialize({
						type: DaiaMessageType.OFFER,
						content: offer,
					})
				}),
				goto: opts.onDone,
				graph: Command.PARENT,
			})
		}, {
			ends: [opts.onDone],
		})
		.addEdge(START, "generate")
		.addEdge("generate", END)
		.compile()
}
