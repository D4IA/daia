import { END, START, StateGraph } from "@langchain/langgraph"
import { DaiaLanggraphMachineNode, DaiaLanggraphStateAccessor, DaiaLanggraphStateSchema, DaiaLanggraphStateWriter, makeDaiaGraph, makeInitialDaiaLanggraphState } from "@daia/langchain"
import z from "zod/v3"
import { PrivateKey } from "@daia/blockchain"
import { ChatOpenAI } from "@langchain/openai"
import { DaiaAgreementReferenceResult, DaiaOfferSigner, DaiaOfferSignResponseType, DaiaInnerOfferContent } from "@daia/core"

const MessageSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
})

const CarAgentState = z.object({
    input: z.string(),
    output: z.string(),

    conversationHistory: z.array(MessageSchema).default([]),

    daia: DaiaLanggraphStateSchema
})

export const initialCarAgentState: z.infer<typeof CarAgentState> = {
    input: "",
    output: "",
    conversationHistory: [],
    daia: makeInitialDaiaLanggraphState()
}

export type CarAgentConfig = {
    privateKey: PrivateKey

    conversingPrompt: string
    offerAnalysisPrompt: string

    conversingModel: string
    offerAnalysisModel: string
    apiKey: string

    signer: DaiaOfferSigner
}

export const makeCarEnterAgent = (config: CarAgentConfig) => {
    const daiaSubgraph = makeDaiaGraph<z.infer<typeof CarAgentState>>({
        publicKey: config.privateKey.toPublicKey().toString(),
        mapNode: (node) => "D_" + node
    });

    const sendDaiaOutput = "D_" + DaiaLanggraphMachineNode.SEND_DAIA_OUTPUT
    const continueConversation = "D_" + DaiaLanggraphMachineNode.CONTINUE_CONVERSING
    const afterPublicIdentityReceived = "D_" + DaiaLanggraphMachineNode.REMOTE_PROCESSED_OFFER
    const afterOfferReceived = "D_" + DaiaLanggraphMachineNode.OFFER_RECEIVED

    const graph = new StateGraph(CarAgentState)
        .addNode("handleInputs", async state => {
            const writer = DaiaLanggraphStateWriter.fromState(state.daia)

            return {
                daia: writer.setInput(state.input).build(),
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
            const llm = new ChatOpenAI({
                model: config.conversingModel,
                apiKey: config.apiKey
            })

            const userInput = state.input

            const history = [
                { role: "system", content: config.conversingPrompt },
                ...state.conversationHistory,
                { role: "user" as const, content: userInput }
            ]

            console.log("[CarAgent LLM] Input:", JSON.stringify(history, null, 2))
            const response = await llm.invoke(
                history.map(msg => ({ role: msg.role, content: msg.content }))
            )
            console.log("[CarAgent LLM] Output:", JSON.stringify(response.content, null, 2))

            const updatedHistory = [
                ...state.conversationHistory,
                { role: "user" as const, content: userInput },
                { role: "assistant" as const, content: `${response.content}` }
            ]

            return {
                output: `${response.content}`,
                conversationHistory: updatedHistory
            }
        })
        .addNode(afterPublicIdentityReceived, async state => {
            const llm = new ChatOpenAI({
                model: config.conversingModel,
                apiKey: config.apiKey
            })
            const userInput = "" // Actual input is DAIA message here, but some response must be generated

            const history = [
                { role: "system", content: config.conversingPrompt },
                ...state.conversationHistory,
                { role: "user" as const, content: userInput }
            ]

            console.log("[CarAgent LLM - After Public ID] Input:", JSON.stringify(history, null, 2))
            const response = await llm.invoke(
                history.map(msg => ({ role: msg.role, content: msg.content }))
            )
            console.log("[CarAgent LLM - After Public ID] Output:", JSON.stringify(response.content, null, 2))

            const updatedHistory = [
                ...state.conversationHistory,
                { role: "assistant" as const, content: `${response.content}` }
            ]

            return {
                output: `${response.content}`,
                conversationHistory: updatedHistory
            }
        })
        .addNode(afterOfferReceived, async state => {
            const writer = DaiaLanggraphStateWriter.fromState(state.daia)
            const accessor = DaiaLanggraphStateAccessor.fromNamespacedState(state)

            const offer = accessor.getOffer()
            if (!offer) throw new Error(`Bad state`)
            const innerOffer: DaiaInnerOfferContent = JSON.parse(offer.inner)
            const naturalLanguageContent = innerOffer.naturalLanguageOfferContent
            const summary = await config.signer.summarizeOffer(offer)

            const sumPayments = Object.values(summary.payments).reduce<number>((acc, val) => acc + val, 0)
            if (sumPayments !== 0) throw new Error("No payments allowed in this protocol");


            const OfferDecisionSchema = z.object({
                acceptOffer: z.boolean().describe("Whether to accept the offer"),
                reason: z.string().describe("Explanation for the decision"),
            })

            const llm = new ChatOpenAI({
                model: config.offerAnalysisModel,
                apiKey: config.apiKey
            }).withStructuredOutput(OfferDecisionSchema)

            const analysisPrompt = [
                { role: "system", content: config.offerAnalysisPrompt },
                { role: "user", content: `Offer: ${naturalLanguageContent}` },
            ]
            console.log("[CarAgent LLM - Offer Analysis] Input:", JSON.stringify(analysisPrompt, null, 2))
            const decision: z.infer<typeof OfferDecisionSchema> = await llm.invoke(analysisPrompt)
            console.log("[CarAgent LLM - Offer Analysis] Output:", JSON.stringify(decision, null, 2))

            if (decision.acceptOffer) {
                let offerSignResult
                try {
                    offerSignResult = await config.signer.signOffer({
                        offer: offer,
                    })
                } catch (error) {
                    console.error(`[CarAgent] Failed to sign offer:`, error)
                    throw new Error(`Failed to sign offer. This likely means the wallet has no UTXOs. Please fund the wallet address: ${config.privateKey.toPublicKey().toAddress("testnet")} with test BSV from a faucet like https://faucet.bitcoincloud.net/`)
                }

                if (offerSignResult.type === DaiaOfferSignResponseType.REQUIREMENT_FAILURE) {
                    throw new Error(`Not enough inputs to sign were provided. This is invalid behavior in this proto.`)
                } else if (offerSignResult.type === DaiaOfferSignResponseType.SUCCESS) {
                    await offerSignResult.transaction.publish()
                    
                    const txId = offerSignResult.transaction.id
                    const whatsonchainUrl = `https://test.whatsonchain.com/tx/${txId}`
                    console.log(`[CarAgent] Transaction published: ${txId}`)
                    console.log(`[CarAgent] View on WhatsOnChain: ${whatsonchainUrl}`)
                    console.log(`[CarAgent] Waiting 10 seconds for transaction to propagate...`)
                    await new Promise(resolve => setTimeout(resolve, 10000))
                    console.log(`[CarAgent] Wait complete, proceeding...`)

                    return {
                        daia: writer.setOfferResponse({
                            result: DaiaAgreementReferenceResult.ACCEPT,
                            agreement: offerSignResult.agreement,
                            agreementReference: offerSignResult.transaction.id
                        }).build(),
                    }
                } else {
                    throw new Error("Unreachable")
                }
            } else {
                return {
                    daia: writer.setOfferResponse({
                        result: DaiaAgreementReferenceResult.REJECT,
                        rationale: decision.reason,
                    }).build()
                }
            }
        })
        .addNode("daiaSubgraph", async (state) => {
            // TODO(teawithsand): instead doing this, next time just add node
            const result = await daiaSubgraph.invoke(state);
            return result;
        }, {
            ends: [sendDaiaOutput, continueConversation, afterPublicIdentityReceived, afterOfferReceived]
        })
        .addEdge(START, "handleInputs")
        .addEdge("handleInputs", "daiaSubgraph")

        .addEdge(afterOfferReceived, "daiaSubgraph")
        .addEdge(sendDaiaOutput, END)
        .addEdge(continueConversation, END)
        .addEdge(afterPublicIdentityReceived, END)
        .compile()

    return graph;
}