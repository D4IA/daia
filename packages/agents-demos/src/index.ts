import "dotenv/config"
import { PrivateKey } from "@daia/blockchain"
import { BsvTransactionFactory, BsvTransactionParser, WhatsOnChainUtxoProvider, BsvNetwork } from "@daia/blockchain"
import { DefaultDaiaOfferSigner, DefaultDaiaAgreementVerifier, DefaultDaiaSignRequirementResolver } from "@daia/core"
import { makeCarEnterAgent, makeGateEnterAgent, initialCarAgentState, initialGateAgentState } from "./enter"

const runDemo = async () => {
    // Setup for testnet
    const net = BsvNetwork.TEST
    
    // Generate private keys for both agents
    const gatePrivateKey = PrivateKey.fromRandom()
    
    // Use funded test key for car agent
    const testPrivateKeyWif = process.env["TEST_PRIVATE_KEY"]
    if (!testPrivateKeyWif) {
        throw new Error("TEST_PRIVATE_KEY not found in .env file")
    }
    const carPrivateKey = PrivateKey.fromWif(testPrivateKeyWif)
    
    console.log(`[Demo] Gate Agent Public Key: ${gatePrivateKey.toPublicKey().toString()}`)
    console.log(`[Demo] Car Agent Public Key: ${carPrivateKey.toPublicKey().toString()}`)
    console.log(`[Demo] Using testnet\n`)
    
    // Setup blockchain infrastructure for gate agent
    const gateTransactionParser = new BsvTransactionParser()
    const gateVerifier = new DefaultDaiaAgreementVerifier(gateTransactionParser)
    
    // Setup blockchain infrastructure for car agent
    const carUtxoProvider = new WhatsOnChainUtxoProvider(carPrivateKey, net)
    const carTransactionFactory = new BsvTransactionFactory(carPrivateKey, net, 1, carUtxoProvider)
    const carSignResolver = new DefaultDaiaSignRequirementResolver(carPrivateKey)
    const carSigner = new DefaultDaiaOfferSigner({
        transactionFactory: carTransactionFactory,
        signResolver: carSignResolver
    })
    
    const gateAgent = makeGateEnterAgent({
        privateKey: gatePrivateKey,
        net: net,
        strictlyConversingPrompt: "You are a parking gate agent. Be friendly and guide the user to accept a parking offer. When ready, make an offer. IMPORTANT: Never use more than 10 satoshis in any transaction. Do not generate offers, there's separate agent that will take over that can do that. You know nothing about the parking, so make no promises and just cut straight to offer generation. Do not hallucinate. Only refer to data given in system prompt.",
        conversingPrompt: "You are a parking gate agent. Be friendly and guide the user to accept a parking offer. When ready, make an offer. IMPORTANT: Never use more than 10 satoshis in any transaction. In order to generate offer, use special generate offer output type. Then put offer parameters inside. You know nothing about the parking, so make no promises and just cut straight to offer generation. Put price of parking in satoshish/hr in natural language in offer content. Be short and concise. Do not hallucinate. Only refer to data given in system prompt.",
        conversingModel: "gpt-5-mini-2025-08-07",
        apiKey: process.env["OPENAI_API_KEY"] || "",
        verifier: gateVerifier
    })
    
    const carAgent = makeCarEnterAgent({
        privateKey: carPrivateKey,
        conversingPrompt: "You are a car agent trying to enter a parking lot. Be polite and accept reasonable offers. IMPORTANT: Never agree to pay more than 10 satoshis. Be short and concise. Do not hallucinate. Only refer to data given in system prompt.",
        offerAnalysisPrompt: "You analyze parking offers from the gate. Accept offers that seem reasonable (no payments required in this protocol). Reject any offer that requires more than 10 satoshis. Be short and concise. Do not hallucinate. Only refer to data given in system prompt.",
        conversingModel: "gpt-5-mini-2025-08-07",
        offerAnalysisModel: "gpt-5-mini-2025-08-07",
        apiKey: process.env["OPENAI_API_KEY"] || "",
        signer: carSigner
    })
    
    let gateAgentState = { ...initialGateAgentState, input: "" }
    let carAgentState = { ...initialCarAgentState, input: "" }
    
    console.log(`[Demo] Starting conversation...\n`)
    
    // for loop rather than for;; to limit max amount of iters for testing
    for (let i = 0; i < 20; i++) {
        console.log(`\n=== Iteration ${i + 1} ===`)
        console.log(`[CarAgent -> GateAgent]: ${carAgentState.input}`)
        
        try {
            gateAgentState.input = carAgentState.output
            console.log(`[GateAgent] Processing input:`, gateAgentState.input.substring(0, 100))
            console.log(`[GateAgent] State BEFORE invoke: status=${gateAgentState.daia.inner.status}`)
            gateAgentState = await gateAgent.invoke(gateAgentState)
            console.log(`[GateAgent -> CarAgent]: ${gateAgentState.output}`)
            console.log(`[GateAgent State]: status=${gateAgentState.daia.inner.status}, hasPublicId=${!!gateAgentState.daia.inner.publicIdentity}, hasRemoteOffer=${!!gateAgentState.daia.output.remoteOffer}, hasRemoteResponse=${!!gateAgentState.daia.output.remoteResponseToLocalOffer}, openGate=${gateAgentState.openGate}`)
        } catch (error) {
            console.error(`[GateAgent] ERROR:`, error)
            throw error
        }
        
        if (gateAgentState.openGate) {
            console.log(`\n[Demo] ✓ Gate opened! Transaction completed successfully.`)
            break
        }
        
        try {
            carAgentState.input = gateAgentState.output
            console.log(`[CarAgent] Processing input...`)
            carAgentState = await carAgent.invoke(carAgentState)
            console.log(`[CarAgent -> GateAgent]: ${carAgentState.output}`)
            console.log(`[CarAgent State]: status=${carAgentState.daia.inner.status}, hasPublicId=${!!carAgentState.daia.inner.publicIdentity}, hasRemoteOffer=${!!carAgentState.daia.output.remoteOffer}, hasRemoteResponse=${!!carAgentState.daia.output.remoteResponseToLocalOffer}`)
        } catch (error) {
            console.error(`[CarAgent] ERROR:`, error)
            throw error
        }
        
        // Check if we should stop
        if (!carAgentState.output || !gateAgentState.output || gateAgentState.openGate) {
            console.log(`\n[Demo] Conversation ended.`)
            break
        }
    }
    
    console.log(`\n[Demo] Demo completed.`)
}

runDemo().catch(error => {
    console.error(`[Demo] Error:`, error)
    process.exit(1)
})