import { config } from "dotenv";
import { BsvNetwork, PrivateKey } from "@d4ia/blockchain";
import { DaiaAgreementReferenceResult, DaiaMessageType, DaiaMessageUtil } from "@d4ia/core";
import {
	CarGateSimulationEnvironment,
	type CarConfiguration,
	type GateConfiguration,
} from "./cargate/environment";
import { CarGateSimulationEventType, type CarGateSimulationEvent } from "./cargate/session";

// Load environment variables
config();

// System prompts that minimize hallucinations
const CAR_CONVERSING_PROMPT = `You are a car agent negotiating parking lot entry.
CRITICAL RULES:
- You MUST ONLY use information explicitly provided in the conversation
- DO NOT invent, assume, or hallucinate any facts, prices, or details
- If you don't know something, ask for clarification
- Be concise and professional
- Your goal is to negotiate a fair parking rate`;

const CAR_OFFER_ANALYSIS_PROMPT = `You are analyzing a parking offer.
CRITICAL RULES:
- You MUST ONLY consider information explicitly stated in the offer
- DO NOT make assumptions about unstated terms
- Accept any parking rate below 50 satoshis per hour
- Reject if the offer is unclear, exceeds 50 satoshis per hour, or missing critical information
- Provide clear rationale for rejection`;

// Gate agent prompts
const GATE_CONVERSING_PROMPT = `You are a parking lot gate agent welcoming cars.
CRITICAL RULES:
- Greet the car professionally and mention you'll prepare a parking offer
- After greeting, indicate you want to make an offer by responding with type: "offer"
- Keep responses brief and professional
- DO NOT discuss prices in conversation - prices are in the formal offer`;

const GATE_OFFER_GENERATION_PROMPT = `You are generating a parking rate offer.
CRITICAL RULES:
- Generate a fair parking rate between 10-45 satoshis per hour
- Consider standard parking rates
- The rate should be reasonable and competitive`;

/**
 * Main demo function that runs the car-gate agent interaction
 *
 * IMPORTANT NOTES:
 * - This demo uses randomly generated BSV testnet keys with no funds by default
 * - Without funded keys, the demo will fail when trying to create the transaction (UTXO fetch fails)
 * - With funded keys, the transaction will be published and you'll see the WhatsOnChain link
 * - The gate may still REJECT if the transaction isn't indexed quickly enough on WhatsOnChain
 *   (the gate tries to verify the transaction on-chain and needs it to be indexed)
 *
 * To run the full demo successfully:
 * 1. Run: npm run genkeys (generates keys and saves to .env)
 * 2. Fund both addresses using: https://faucet.bsvblockchain.org/
 * 3. Wait ~10 seconds for funding transactions to be indexed
 * 4. Run the demo again
 * 5. If gate still rejects, increase the sleep time in car/graph.ts after transaction publish
 */
export async function runEnterDemo(): Promise<void> {
	console.log("=".repeat(80));
	console.log("CAR ENTER DEMO - BSV Testnet");
	console.log("=".repeat(80));
	console.log();

	// Get OpenAI API key
	const openAIApiKey = process.env["OPENAI_API_KEY"];
	if (!openAIApiKey) {
		throw new Error("OPENAI_API_KEY not found in environment variables");
	}

	console.log("Step 1: Generating BSV testnet keys...");

	// Use keys from environment variables if available, otherwise generate random keys
	let carPrivateKey: PrivateKey;
	let gatePrivateKey: PrivateKey;

	if (process.env["CAR_PRIVATE_KEY"] && process.env["GATE_PRIVATE_KEY"]) {
		console.log("  Using keys from environment variables");
		carPrivateKey = PrivateKey.fromWif(process.env["CAR_PRIVATE_KEY"]);
		gatePrivateKey = PrivateKey.fromWif(process.env["GATE_PRIVATE_KEY"]);
	} else {
		console.log("  ⚠️  No keys in .env file - generating random keys (these will have no funds)");
		console.log("  To use funded keys:");
		console.log("    1. Run: npm run genkeys");
		console.log("    2. Add keys to .env file");
		console.log("    3. Fund addresses using: https://faucet.bsvblockchain.org/");
		console.log();
		carPrivateKey = PrivateKey.fromRandom();
		gatePrivateKey = PrivateKey.fromRandom();
	}

	const carPublicKey = carPrivateKey.toPublicKey();
	const carAddress = carPublicKey.toAddress();

	const gatePublicKey = gatePrivateKey.toPublicKey();
	const gateAddress = gatePublicKey.toAddress();

	console.log(`  Car Address: ${carAddress}`);
	console.log(`  Gate Address: ${gateAddress}`);
	console.log();

	console.log("Step 2: Creating simulation environment...");

	const network = BsvNetwork.TEST;

	// Create car configuration
	const carConfig: CarConfiguration = {
		licensePlate: "TEST-123",
		privateKey: carPrivateKey,
		negotiationPrompt: CAR_CONVERSING_PROMPT,
		negotiationModel: "gpt-4o-mini",
		offerConsiderationPrompt: CAR_OFFER_ANALYSIS_PROMPT,
		offerConsiderationModel: "gpt-4o-mini",
	};

	// Create gate configuration
	const gateConfig: GateConfiguration = {
		privateKey: gatePrivateKey,
		conversationPrompt: GATE_CONVERSING_PROMPT,
		conversationModel: "gpt-4o-mini",
		offerGeneratingPrompt: GATE_OFFER_GENERATION_PROMPT,
		offerGeneratingModel: "gpt-4o-mini",
	};

	// Create environment
	const envConfig = {
		openAIApiKey,
		network,
		gateConfig,
		maxTurns: 50,
	};

	const environment = new CarGateSimulationEnvironment(envConfig);
	environment.addCar(carConfig);

	console.log("  ✓ Environment created");
	console.log("  ✓ Car registered");
	console.log();

	console.log("Step 3: Running agent conversation...");
	console.log("-".repeat(80));
	console.log();

	try {
		let currentTurn = 0;
		let finalDecision: "let-in" | "reject" | null = null;

		const session = environment.createSession(carConfig.licensePlate);

		const onNewMessage = (event: CarGateSimulationEvent) => {
			if (event.type === CarGateSimulationEventType.CAR_TO_GATE_MESSAGE) {
				currentTurn++;
				console.log(`[Turn ${currentTurn}]`);
				console.log();
				console.log(`🚗 Car → Gate: ${event.message || "(initial empty message)"}`);
			} else if (event.type === CarGateSimulationEventType.GATE_TO_CAR_MESSAGE) {
				console.log(`🚦 Gate → Car: ${event.message}`);
				console.log();

				// Check if car just published a transaction (DAIA offer-response message)
				if (DaiaMessageUtil.isDaiaMessage(event.message)) {
					try {
						const daiaMessage = DaiaMessageUtil.deserialize(event.message);
						if (
							daiaMessage.type === DaiaMessageType.OFFER_RESPONSE &&
							daiaMessage.result === DaiaAgreementReferenceResult.ACCEPT
						) {
							const txId = daiaMessage.agreementReference;
							console.log(`\n📝 Transaction published by car agent`);
							console.log(`✅ Transaction ID: ${txId}`);
							console.log(`🔗 View on WhatsOnChain: https://test.whatsonchain.com/tx/${txId}`);
							console.log(`⏳ Transaction is being indexed on blockchain...\n`);
						}
					} catch {
						// Ignore parse errors
					}
				}

				console.log("-".repeat(80));
				console.log();
			} else if (event.type === CarGateSimulationEventType.GATE_ACTION) {
				finalDecision = event.action as "let-in" | "reject";
				console.log(`🚦 Gate final decision: ${event.action.toUpperCase()}`);
			} else if (event.type === CarGateSimulationEventType.SESSION_END) {
				console.log(`🏁 ${event.side === "gate" ? "Gate" : "Car"} ended the conversation`);
			} else if (event.type === CarGateSimulationEventType.MAX_TURNS_REACHED) {
				console.log(`⚠️  Maximum turns (${event.turns}) reached without completion`);
			}
		};

		const result = await session.run({ onNewMessage });

		console.log();
		console.log("=".repeat(80));
		console.log("DEMO COMPLETED");
		console.log("=".repeat(80));
		console.log(`Total turns: ${currentTurn}`);
		console.log(`Final decision: ${finalDecision || "none"}`);
		console.log();

		// Log final states
		console.log("Final Car Agent State:");
		console.log(`  Memory - Is parked: ${result.carMemory.isParked}`);
		const parkAgreement = result.carMemory.getParkAgreement();
		if (parkAgreement) {
			console.log(`  Memory - Park time: ${parkAgreement.parkTime.toISOString()}`);
			console.log(`  Memory - Agreement reference (TX): ${parkAgreement.reference}`);
			console.log(`  Memory - Agreement content length: ${parkAgreement.content.length} chars`);
		}
		console.log();

		console.log("Final Gate Agent State:");
		const allCars = result.gateDb.all();
		console.log(`  Cars in database: ${allCars.length}`);
		if (allCars.length > 0) {
			console.log("  Parked cars:");
			for (const car of allCars) {
				console.log(`    - License: ${car.data.licensePlate}`);
				console.log(`      Rate: ${car.data.ratePerHour} satoshis/hour`);
				console.log(`      Parked at: ${car.data.parkedAt.toISOString()}`);
				console.log(`      Transaction: ${car.data.parkingTransactionId}`);
			}
		}
		console.log();
	} catch (error) {
		console.error();
		console.error("❌ Error during conversation:");
		console.error(error);
		throw error;
	}
}

// Run the demo if this file is executed directly
if (require.main === module) {
	runEnterDemo()
		.then(() => {
			console.log("✓ Demo completed successfully");
			process.exit(0);
		})
		.catch((error) => {
			console.error("✗ Demo failed:", error);
			process.exit(1);
		});
}
