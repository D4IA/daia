import { PrivateKey } from "@daia/blockchain"
import { DaiaAgreementReferenceResult, DaiaAgreementVerifier, DaiaOfferContent, DaiaRequirementType } from "@daia/core"
import { DaiaLanggraphMachineNode, DaiaLanggraphMethodId, DaiaLanggraphStateAccessor, DaiaLanggraphStateSchema, DaiaLanggraphStateWriter, makeDaiaGraph, makeInitialDaiaLanggraphState } from "@daia/langchain"
import { Command, END, START, StateGraph } from "@langchain/langgraph"
import { ChatOpenAI } from "@langchain/openai"
import z from "zod/v3"

const MessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
})

const GateAgentState = z.object({
    input: z.string(),
    output: z.string(),

    openGate: z.boolean(),

    conversationHistory: z.array(MessageSchema).default([]),

    daia: DaiaLanggraphStateSchema
})

export const initialGateAgentState: z.infer<typeof GateAgentState> = {
    input: "",
    output: "",
    openGate: false,
    conversationHistory: [],
    daia: makeInitialDaiaLanggraphState()
}

export type GateAgentConfig = {
    privateKey: PrivateKey
    net: "test" | "main"

    conversingPrompt: string
    strictlyConversingPrompt: string

    conversingModel: string
    apiKey: string

    verifier: DaiaAgreementVerifier
}

export const makeGateEnterAgent = (config: GateAgentConfig) => {
    const daiaSubgraph = makeDaiaGraph<z.infer<typeof GateAgentState>>({
        publicKey: config.privateKey.toPublicKey().toString(),
        mapNode: (node) => "D_" + node
    });

    const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT
    const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING
    const afterRemoteProcessedOffer = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER

    const graph = new StateGraph(GateAgentState)
        .addNode("handleInputs", async state => {
            const writer = DaiaLanggraphStateWriter.fromState(state.daia)
            console.log(`[GateAgent handleInputs] Status before: ${state.daia.inner.status}`)
            const newDaia = writer.setInput(state.input).build()
            console.log(`[GateAgent handleInputs] Status after: ${newDaia.inner.status}`)

            return {
                daia: newDaia,
            }
        })
        .addNode(sendDaiaOutput, async state => {
            const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state)

            return {
                output: accessor.getOutput(),
                daia: state.daia
            }
        })
        .addNode(continueConversation, async state => {
            const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state)

            const ResponseSchema = z.object({
                type: z.enum(["natural_language", "offer"]).describe("The type of response: natural_language for continuing conversation, or offer to make a parking offer"),
                content: z.string().describe("Either a conversational response or a parking offer with fee in satoshis/hr")
            })

            const llm = new ChatOpenAI({
                model: config.conversingModel,
                apiKey: config.apiKey
            }).withStructuredOutput(ResponseSchema)

            const userInput = state.input

            const prompt = [
                { role: "system", content: config.conversingPrompt },
                ...state.conversationHistory,
                { role: "user" as const, content: userInput }
            ]

            console.log("[GateAgent LLM] Input:", JSON.stringify(prompt, null, 2))
            const response = await llm.invoke(
                prompt.map(msg => ({ role: msg.role, content: msg.content }))
            )
            console.log("[GateAgent LLM] Output:", JSON.stringify(response, null, 2))

            if (response.type === "natural_language") {
                const updatedHistory = [
                    ...state.conversationHistory,
                    { role: "user" as const, content: userInput },
                    { role: "assistant" as const, content: response.content }
                ]
                return new Command({
                    goto: END,
                    update: {
                        output: response.content,
                        conversationHistory: updatedHistory,
                        responseType: response.type
                    },
                })
            } else {
                const responseContent = response.content
                const updatedHistory = [
                    ...state.conversationHistory,
                    { role: "user" as const, content: userInput },
                    { role: "assistant" as const, content: responseContent }
                ]

                const offer: DaiaOfferContent = {
                    naturalLanguageOfferContent: response.content,
                    offerTypeIdentifier: "DAIA-PARKING-ENTER",
                    requirements: (() => {
                        return {
                            sign: {
                                type: DaiaRequirementType.SIGN,
                                offererNonce: "adsadasda" + Math.random(),
                                pubKey: accessor.remotePublicKey() ?? "",
                            },
                        }
                    })(),
                }

                const daia = DaiaLanggraphStateWriter.fromState(state.daia)
                    .setMethodCall({
                        methodId: DaiaLanggraphMethodId.SEND_OFFER,
                        offer: offer,
                    })
                    .build()

                return new Command({
                    goto: "daiaSubgraph",
                    update: {
                        conversationHistory: updatedHistory,
                        daia,
                    }
                })
            }
        })
        .addNode("pub-id-recv", async state => {
            const llm = new ChatOpenAI({
                model: config.conversingModel,
                apiKey: config.apiKey
            })

            const prompt = [
                { role: "system", content: config.strictlyConversingPrompt },
                ...state.conversationHistory,
            ]

            const response = await llm.invoke(
                prompt.map(msg => ({ role: msg.role, content: msg.content }))
            )


            return {
                output: `${response.content}`,
                conversationHistory: [
                    ...state.conversationHistory,
                    { role: "assistant" as const, content: response.content?.toString() }
                ]
            }
        })
        .addNode(afterRemoteProcessedOffer, async state => {
            const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state)
            const offerResponse = accessor.getOfferResponse()
            if (!offerResponse || offerResponse?.result === DaiaAgreementReferenceResult.REJECT) {
                return new Command({
                    goto: "pub-id-recv",
                    update: {
                        conversationHistory: [
                            ...state.conversationHistory,
                            { role: "user" as const, content: "User has rejected your offer" },
                        ]
                    }
                })
            }

            // TODO(teawithsand): here run verification

            return new Command({
                goto: END,
                update: {
                    openGate: true
                }
            })
        })
        .addNode("daiaSubgraph", async (state) => {
            // TODO(teawithsand): instead doing this, next time just add node
            const result = await daiaSubgraph.invoke(state);
            return result;
        }, {
            ends: [sendDaiaOutput, continueConversation, "pub-id-recv", afterRemoteProcessedOffer]
        })
        .addEdge(START, "handleInputs")
        .addEdge("handleInputs", "daiaSubgraph")

        .addEdge(afterRemoteProcessedOffer, "daiaSubgraph")
        .addEdge(sendDaiaOutput, END)
        .addEdge(continueConversation, END)
        .addEdge("pub-id-recv", END)
        .compile()

    return graph;
}