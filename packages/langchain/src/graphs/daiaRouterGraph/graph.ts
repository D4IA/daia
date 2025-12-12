import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { produce } from "immer"
import { DaiaMessage, DaiaMessageType } from "../../messages"
import { DaiaStateNamespaced, DaiaStateNamespacedSchema } from "../../state"
import { DaiaMessageUtils } from "../../utils/daia"
import { DaiaRouterOptions } from "./types"

export const makeDaiaRouterGraph = (opts: DaiaRouterOptions) => {
    const detectAndRoute = async (state: Readonly<DaiaStateNamespaced>) => {
        const incoming = state.daia.input.inputText
        const isDaia = incoming ? DaiaMessageUtils.isDaiaMessage(incoming) : false

        if (isDaia) {
            const parseResult: DaiaMessage = DaiaMessageUtils.parse(incoming)


            if (parseResult.type === DaiaMessageType.OFFER) {
                return new Command({
                    update: produce(state, draft => {
                        draft.daia.router.inputText = incoming
                        draft.daia.router.offerParsed = parseResult.content
                    }),
                    goto: opts.onDaiaOffer,
                    graph: Command.PARENT,
                })
            } else if(parseResult.type === DaiaMessageType.PUBLIC_IDENTITY_REQUEST) {
                return new Command({
                    update: produce(state, draft => {
                        draft.daia.router.inputText = incoming
                        draft.daia.router.offerParsed = null
                    }),
                    goto: opts.onPublicIdentityRequest,
                    graph: Command.PARENT,
                })
            } else if(parseResult.type === DaiaMessageType.PUBLIC_IDENTITY_RESPONSE) {
                return new Command({
                    update: produce(state, draft => {
                        draft.daia.router.inputText = incoming
                        draft.daia.router.offerParsed = null
                        draft.daia.router.publicIdentityResponseParsed = parseResult
                    }),
                    goto: opts.onPublicIdentityResponse,
                    graph: Command.PARENT,
                })
            }
        }

        return new Command({
            update: produce(state, draft => {
                draft.daia.router.inputText = incoming
                draft.daia.router.offerParsed = null
                draft.daia.router.publicIdentityResponseParsed = null
            }),
            goto: opts.onNonDaiaInput,
            graph: Command.PARENT,
        })
    }

    return new StateGraph(DaiaStateNamespacedSchema)
        .addNode("detect", detectAndRoute)
        .addEdge(START, "detect")
        .addEdge("detect", END)
        .compile()
}
