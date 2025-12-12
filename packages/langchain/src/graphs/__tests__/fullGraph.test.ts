import { END, START, StateGraph } from "@langchain/langgraph";
import { describe, test, expect } from "vitest";
import z from "zod/v3";
import { DaiaStateSchema, DaiaStateBuilder, DaiaStateAccessor } from "../../state";
import { makeDaiaRouterGraph } from "../daiaRouterGraph";
import { makeDaiaRequestPublicIdentityGraph } from "../daiaRequestPublicIdentityGraph";
import { makeDaiaResponsePublicIdentityGraph } from "../daiaResponsePublicIdentityGraph";
import { makeDaiaGeneratePublicIdentityResponseGraph } from "../daiaGeneratePublicIdentityResponse";
import { makeDaiaOfferGenerationGraph } from "../daiaOfferGenerationGraph";
import { DaiaOfferContent } from "@daia/proto";

describe.skip("public key exchange example", () => {

    const state = z.object({
        daia: DaiaStateSchema,
        invocationInput: z.string(),
        invocationOutput: z.string(),
    })

    const daiaRouterNode = makeDaiaRouterGraph({
        onDaiaOffer: "handle_daia_offer",
        onPublicIdentityRequest: "generate_public_id_response",
        onPublicIdentityResponse: "handle_public_id_res",
        onNonDaiaInput: "send_public_id_request",
    })

    const publicKeyRequestNode = makeDaiaRequestPublicIdentityGraph({
        onRequestPerformed: END
    })

    const publicKeyResponseGeneratorNode = makeDaiaGeneratePublicIdentityResponseGraph({
        onResponseGenerated: END
    })

    const onPublicKeyIdResponse = makeDaiaResponsePublicIdentityGraph({
        onResponseProcessed: "handle_answer_after_public_key_response"
    })

    const daiaOfferGenerateNode = makeDaiaOfferGenerationGraph({
        generateOffer: async (): Promise<DaiaOfferContent> => {
            return {
                naturalLanguageOfferContent: "example offer content",
                offerTypeIdentifier: "asdf",
                requirements: new Map
            }
        },
        onDone: "send_daia_output"
    })


    const graph = new StateGraph(state)
        .addNode("handle_daia_offer", () => ({}))
        .addNode("handle_answer_after_public_key_response", async () => {
            return {
                invocationOutput: "public key was received just fines"
            }
        })
        .addNode("send_public_id_request", publicKeyRequestNode, {
            ends: [END]
        })
        .addNode("generate_public_id_response", publicKeyResponseGeneratorNode, {
            ends: [END]
        })
        .addNode("handle_public_id_res", onPublicKeyIdResponse, {
            ends: ["handle_answer_after_public_key_response"]
        })
        .addNode("router", daiaRouterNode, {
            ends: ["handle_daia_offer", "send_public_id_request", "generate_public_id_response", "handle_public_id_res"]
        })
        .addNode("send_daia_output", async state => {
            const accessor = new DaiaStateAccessor(state)

            return {
                invocationOutput: accessor.getDaiaOutput(),
            }
        })
        .addEdge(START, "router")
        .addEdge("send_daia_output", END)
        .compile();

})