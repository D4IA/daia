import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { produce } from "immer"
import { DaiaStateNamespaced, DaiaStateNamespacedSchema } from "../../state"
import { DaiaGeneratePublicIdentityResponseGraphOpts } from "./types"
import { DaiaMessageUtils } from "../../utils/daia"
import { DaiaMessageType } from "../../messages"

export const makeDaiaGeneratePublicIdentityResponseGraph = (opts: DaiaGeneratePublicIdentityResponseGraphOpts) => {
    return new StateGraph(DaiaStateNamespacedSchema)
        .addNode("handle", async (state: Readonly<DaiaStateNamespaced>) => {
            const myPublicKey = state.daia.requestPublicIdentity.publicKey
            
            return new Command({
                update: produce(state, draft => {
                    draft.daia.output.outputText = DaiaMessageUtils.serialize({
                        type: DaiaMessageType.PUBLIC_IDENTITY_RESPONSE,
                        publicKey: myPublicKey,
                    })
                }),
                goto: opts.onResponseGenerated,
                graph: Command.PARENT,
            })
        })
        .addEdge(START, "handle")
        .addEdge("handle", END)
        .compile()
}
