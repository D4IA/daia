import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { produce } from "immer"
import { DaiaStateNamespaced, DaiaStateNamespacedSchema } from "../../state"
import { DaiaResponsePublicIdentityGraphOpts } from "./types"

export const makeDaiaResponsePublicIdentityGraph = (opts: DaiaResponsePublicIdentityGraphOpts) => {
    return new StateGraph(DaiaStateNamespacedSchema)
        .addNode("handle", async (state: Readonly<DaiaStateNamespaced>) => {
            const parseResult = state.daia.router.publicIdentityResponseParsed

            return new Command({
                update: produce(state, draft => {
                    if (parseResult) {
                        if (draft.daia.remotePublicKey.remotePublicKey) {
                            throw new Error("Remote public key is already set")
                        }
                        
                        draft.daia.remotePublicKey.remotePublicKey = parseResult.publicKey
                        draft.daia.responsePublicIdentity.receivedPublicKey = parseResult.publicKey
                        draft.daia.responsePublicIdentity.processed = true
                    } else {
                        draft.daia.responsePublicIdentity.receivedPublicKey = ""
                        draft.daia.responsePublicIdentity.processed = false
                    }
                }),
                goto: opts.onResponseProcessed,
                graph: Command.PARENT,
            })
        })
        .addEdge(START, "handle")
        .addEdge("handle", END)
        .compile()
}
