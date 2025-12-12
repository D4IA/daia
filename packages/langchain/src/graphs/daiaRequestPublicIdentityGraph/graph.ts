import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { produce } from "immer"
import { DaiaStateNamespaced, DaiaStateNamespacedSchema } from "../../state"
import { DaiaRequestPublicIdentityGraphOpts } from "./types"
import { DaiaMessageUtils } from "../../utils/daia"
import { DaiaMessageType } from "../../messages"

export const makeDaiaRequestPublicIdentityGraph = (opts: DaiaRequestPublicIdentityGraphOpts) => {
    return new StateGraph(DaiaStateNamespacedSchema)
        .addNode("handle", async (state: Readonly<DaiaStateNamespaced>) => {
            return new Command({
                update: produce(state, draft => {
                    draft.daia.output.outputText = DaiaMessageUtils.serialize({
                        type: DaiaMessageType.PUBLIC_IDENTITY_REQUEST,
                    })
                }),
                goto: opts.onRequestPerformed,
                graph: Command.PARENT,
            })
        })
        .addEdge(START, "handle")
        .addEdge("handle", END)
        .compile()
}
