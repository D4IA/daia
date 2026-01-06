import { config } from "dotenv";
import { BsvNetwork, PrivateKey } from "@d4ia/blockchain-bridge";
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
// ENTER PHASE PROMPTS (used for initial parking entry)
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

// Gate agent prompts for enter phase
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
 * Main demo function that runs a complete parking scenario: enter then exit
 *
 * IMPORTANT NOTES:
 * - This demo runs TWO sequential sessions:
 *   1. ENTER: Car negotiates entry, agrees on rate, publishes parking transaction
 *   2. EXIT: Car negotiates exit, pays for parking, gate verifies and allows exit
 * - No state mocking - real transaction IDs flow from enter to exit
 * - Uses the same environment instance so state persists between sessions
 * - The demo uses BSV testnet keys
 * - With funded keys, both parking and payment transactions are published
 *
 * To run the full demo successfully:
 * 1. Run: npm run genkeys (generates keys and saves to .env)
 * 2. Fund both addresses using: https://scrypt.io/faucet/ or https://witnessonchain.com/faucet/tbsv
 * 3. Wait ~10 seconds for funding transactions to be indexed
 * 4. Run the demo
 */
export async function runExitDemo(): Promise<void> {
	console.log("=".repeat(80));
	console.log("CAR PARKING DEMO - Enter then Exit - BSV Testnet");
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
		console.log("  ⚠️  No keys in .env file");
		console.log();
		console.log("  To run this demo:");
		console.log("    1. Run: npm run genkeys");
		console.log(
			"    2. Fund both addresses using: https://scrypt.io/faucet/ or https://witnessonchain.com/faucet/tbsv",
		);
		console.log("    3. Wait ~10 seconds for funding transactions to be indexed");
		console.log("    4. Run: npm run demo:exit");
		console.log();
		throw new Error("CAR_PRIVATE_KEY and GATE_PRIVATE_KEY must be set in .env file");
	}

	const carPublicKey = carPrivateKey.toPublicKey();
	const carAddress = carPublicKey.toAddress("testnet");

	const gatePublicKey = gatePrivateKey.toPublicKey();
	const gateAddress = gatePublicKey.toAddress("testnet");

	console.log(`  Car Address: ${carAddress}`);
	console.log(`  Car Address: ${carAddress}`);
	console.log(`  Gate Address: ${gateAddress}`);
	console.log();

	console.log("Step 2: Creating simulation environment...");

	const network = BsvNetwork.TEST;
	const licensePlate = "TEST-123";

	// Create car configuration
	const carConfig: CarConfiguration = {
		licensePlate,
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

	console.log("Step 3: Running ENTER session...");
	console.log("=".repeat(80));
	console.log("PHASE 1: CAR ENTRY");
	console.log("=".repeat(80));
	console.log();

	try {
		// ========== ENTER SESSION ==========
		let enterTurns = 0;
		let enterDecision: "let-in" | "reject" | null = null;

		const enterSession = environment.createSession(licensePlate);

		const onEnterMessage = (event: CarGateSimulationEvent) => {
			if (event.type === CarGateSimulationEventType.CAR_TO_GATE_MESSAGE) {
				enterTurns++;
				console.log(`[Enter Turn ${enterTurns}]`);
				console.log();
				console.log(`🚗 Car → Gate: ${event.message || "(initial empty message)"}`);
			} else if (event.type === CarGateSimulationEventType.GATE_TO_CAR_MESSAGE) {
				console.log(`🚦 Gate → Car: ${event.message}`);
				console.log();

				// Check if car just published a parking transaction
				if (DaiaMessageUtil.isDaiaMessage(event.message)) {
					try {
						const daiaMessage = DaiaMessageUtil.deserialize(event.message);
						if (
							daiaMessage.type === DaiaMessageType.OFFER_RESPONSE &&
							daiaMessage.result === DaiaAgreementReferenceResult.ACCEPT
						) {
							const txId = daiaMessage.agreementReference;
							console.log(`\n📝 Parking transaction published by car agent`);
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
				enterDecision = event.action as "let-in" | "reject";
				console.log(`🚦 Gate decision: ${event.action.toUpperCase()}`);
			} else if (event.type === CarGateSimulationEventType.SESSION_END) {
				console.log(`🏁 ${event.side === "gate" ? "Gate" : "Car"} ended the enter conversation`);
			} else if (event.type === CarGateSimulationEventType.MAX_TURNS_REACHED) {
				console.log(`⚠️  Maximum turns (${event.turns}) reached without completion`);
			}
		};

		const enterResult = await enterSession.run({ onNewMessage: onEnterMessage });

		console.log();
		console.log("=".repeat(80));
		console.log("ENTER SESSION COMPLETED");
		console.log("=".repeat(80));
		console.log(`Enter turns: ${enterTurns}`);
		console.log(`Enter decision: ${enterDecision || "none"}`);
		console.log();

		// Log state after enter
		const parkAgreement = enterResult.carMemory.getParkAgreement();
		if (parkAgreement) {
			console.log("State after ENTER:");
			console.log(`  Car is parked: ${enterResult.carMemory.isParked}`);
			console.log(`  Parking transaction ID: ${parkAgreement.reference}`);
			console.log(
				`  Parking rate: ${enterResult.gateDb.getByPlate(licensePlate)?.data.ratePerHour} satoshis/hour`,
			);
			console.log(`  Parked at: ${parkAgreement.parkTime.toISOString()}`);
			console.log();
		}

		// ========== EXIT SESSION ==========
		console.log("=".repeat(80));
		console.log("PHASE 2: CAR EXIT");
		console.log("=".repeat(80));
		console.log();

		let exitTurns = 0;
		let exitDecision: "let-out" | "reject" | null = null;

		const exitSession = environment.createSession(licensePlate);

		const onExitMessage = (event: CarGateSimulationEvent) => {
			if (event.type === CarGateSimulationEventType.GATE_LOG) {
				console.log(`[GATE] ${event.message}`);
				return;
			} else if (event.type === CarGateSimulationEventType.CAR_LOG) {
				console.log(`[CAR] ${event.message}`);
				return;
			} else if (event.type === CarGateSimulationEventType.CAR_TO_GATE_MESSAGE) {
				exitTurns++;
				console.log(`[Exit Turn ${exitTurns}]`);
				console.log();
				console.log(`🚗 Car → Gate: ${event.message || "(initial empty message)"}`);
			} else if (event.type === CarGateSimulationEventType.GATE_TO_CAR_MESSAGE) {
				console.log(`🚦 Gate → Car: ${event.message}`);
				console.log();

				// Check if car just published a payment transaction
				if (DaiaMessageUtil.isDaiaMessage(event.message)) {
					try {
						const daiaMessage = DaiaMessageUtil.deserialize(event.message);
						if (
							daiaMessage.type === DaiaMessageType.OFFER_RESPONSE &&
							daiaMessage.result === DaiaAgreementReferenceResult.ACCEPT
						) {
							const txId = daiaMessage.agreementReference;
							console.log(`\n📝 Payment transaction published by car agent`);
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
				exitDecision = event.action as "let-out" | "reject";
				console.log(`🚦 Gate decision: ${event.action.toUpperCase()}`);
			} else if (event.type === CarGateSimulationEventType.SESSION_END) {
				console.log(`🏁 ${event.side === "gate" ? "Gate" : "Car"} ended the exit conversation`);
			} else if (event.type === CarGateSimulationEventType.MAX_TURNS_REACHED) {
				console.log(`⚠️  Maximum turns (${event.turns}) reached without completion`);
			}
		};

		const exitResult = await exitSession.run({ onNewMessage: onExitMessage });

		console.log();
		console.log("=".repeat(80));
		console.log("EXIT SESSION COMPLETED");
		console.log("=".repeat(80));
		console.log(`Exit turns: ${exitTurns}`);
		console.log(`Exit decision: ${exitDecision || "none"}`);
		console.log();

		console.log("=".repeat(80));
		console.log("FULL DEMO COMPLETED");
		console.log("=".repeat(80));
		console.log(`Total turns: ${enterTurns + exitTurns} (Enter: ${enterTurns}, Exit: ${exitTurns})`);
		console.log(`Enter decision: ${enterDecision || "none"}`);
		console.log(`Exit decision: ${exitDecision || "none"}`);
		console.log();

		// Log final states
		console.log("Final Car Agent State:");
		console.log(`  Is parked: ${exitResult.carMemory.isParked}`);

		const finalParkAgreement = exitResult.carMemory.getParkAgreement();
		if (finalParkAgreement) {
			console.log("  Parking agreement (still in memory):");
			console.log(`    - Content: ${finalParkAgreement.content}`);
			console.log(`    - Reference: ${finalParkAgreement.reference}`);
			console.log(`    - Parked at: ${finalParkAgreement.parkTime.toISOString()}`);
			const parkDuration = (Date.now() - finalParkAgreement.parkTime.getTime()) / 1000 / 60;
			console.log(`    - Duration: ${Math.floor(parkDuration)} minutes`);
		} else {
			console.log("  (No parking agreement - car has fully exited)");
		}
		console.log();

		const allCars = exitResult.gateDb.all();
		console.log("Final Gate Agent State:");
		console.log(`  Cars in database: ${allCars.length}`);
		if (allCars.length > 0) {
			console.log("  Remaining parked cars:");
			for (const car of allCars) {
				console.log(`    - License: ${car.data.licensePlate}`);
				console.log(`      Rate: ${car.data.ratePerHour} satoshis/hour`);
				console.log(`      Parked at: ${car.data.parkedAt.toISOString()}`);
				console.log(`      Transaction: ${car.data.parkingTransactionId}`);
			}
		} else {
			console.log("  (Database is empty - car was successfully removed after exit)");
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
	runExitDemo()
		.then(() => {
			console.log("✓ Demo completed successfully");
			process.exit(0);
		})
		.catch((error) => {
			console.error("✗ Demo failed:", error);
			process.exit(1);
		});
}
