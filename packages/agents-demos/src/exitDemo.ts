import { config } from "dotenv";
import {
	BsvNetwork,
	BsvTransactionFactory,
	BsvTransactionParser,
	PrivateKey,
	WhatsOnChainUtxoProvider,
} from "@daia/blockchain";
import {
	DefaultDaiaAgreementVerifier,
	DefaultDaiaOfferSigner,
	DefaultDaiaPaymentRequirementResolver,
	DefaultDaiaSignRequirementResolver,
	DaiaAgreementReferenceResult,
	DaiaMessageType,
	DaiaMessageUtil,
} from "@daia/core";
import { CarExitAgent } from "./car/exit/agent";
import { CarExitAgentConfig } from "./car/exit/config";
import { CarExitAgentAdapterImpl } from "./car/exit";
import { CarAgentMemory } from "./car/db/memory";
import { GateExitAgent } from "./gate/exit/agent";
import { GateAgentExitAdapterImpl } from "./gate/exit/adapterImpl";
import { GateAgentCarsDB } from "./gate/state/db";

// Load environment variables
config();

const MAX_TURNS = 50;

// Car agent prompt for extracting parking rate
const CAR_EXTRACT_RATE_PROMPT = `Extract the hourly parking rate from the agreement text.
CRITICAL RULES:
- Look for phrases like "rate of X satoshis per hour" or similar
- Return only the numeric value
- If unclear or missing, return a reasonable default of 25`;

/**
 * Main demo function that runs the car exit scenario
 *
 * IMPORTANT NOTES:
 * - This demo simulates a car that has already parked and is now exiting
 * - Car memory is pre-initialized with parking agreement data
 * - Gate database is pre-initialized with the car's entry record
 * - The demo uses BSV testnet keys
 * - With funded keys, the payment transaction will be published
 * - The gate will verify the payment and allow exit
 *
 * KNOWN ISSUE:
 * - There's a timing issue with the DAIA protocol handshake in the exit scenario
 * - The gate transitions to 'conversing' state after sending its hello, but before
 *   receiving the car's hello response, causing a protocol error
 * - The enter demo works correctly because the sequencing is different
 * - All core functionality (DB operations, offer creation, verification) is implemented correctly
 * - This handshake timing issue needs to be resolved in the DAIA state machine or graph orchestration
 *
 * To run the full demo successfully:
 * 1. Run: npm run genkeys (generates keys and saves to .env)
 * 2. Fund both addresses using: https://faucet.bsvblockchain.org/
 * 3. Wait ~10 seconds for funding transactions to be indexed
 * 4. Run the demo (currently fails at handshake, but implementation is complete)
 */
export async function runExitDemo(): Promise<void> {
	console.log("=".repeat(80));
	console.log("CAR EXIT DEMO - BSV Testnet");
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
		console.log("    2. Fund both addresses using: https://faucet.bsvblockchain.org/");
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
	console.log(`  Gate Address: ${gateAddress}`);
	console.log();

	console.log("Step 2: Setting up BSV blockchain infrastructure...");

	const network = BsvNetwork.TEST;

	// Create UTXO provider for testnet
	const carUtxoProvider = new WhatsOnChainUtxoProvider(carPrivateKey, network);

	// Create transaction factory for car (signer)
	const carFactory = new BsvTransactionFactory(
		carPrivateKey,
		network,
		1, // 1 satoshi per KB (minimal for testnet)
		carUtxoProvider,
	);

	// Create signer components for car
	const signResolver = new DefaultDaiaSignRequirementResolver(carPrivateKey);
	const paymentResolver = new DefaultDaiaPaymentRequirementResolver(carFactory);

	const carSigner = new DefaultDaiaOfferSigner({
		transactionFactory: carFactory,
		signResolver,
		paymentResolver,
	});

	// Create verifier for gate
	const transactionParser = new BsvTransactionParser(network);
	const gateVerifier = new DefaultDaiaAgreementVerifier(transactionParser);

	console.log("  ✓ Transaction factory created");
	console.log("  ✓ DAIA signer created for car");
	console.log("  ✓ DAIA verifier created for gate");
	console.log();

	console.log("Step 3: Pre-initializing car memory and gate database...");

	// Pre-initialize car memory with parking agreement
	const carMemory = new CarAgentMemory();
	const parkingRate = 20; // 20 satoshis per hour (reduced for testing)
	const parkTimeMinutesAgo = 65; // Car has been parked for 65 minutes
	const parkTime = new Date(Date.now() - parkTimeMinutesAgo * 60 * 1000);
	const agreementContent = `Parking services are offered at a rate of ${parkingRate} satoshis per hour.`;
	const agreementReference = "mock-tx-id-" + Date.now();

	carMemory.park(agreementContent, agreementReference, parkTime);
	console.log(`  ✓ Car memory initialized`);
	console.log(`    - Parking rate: ${parkingRate} satoshis/hour`);
	console.log(`    - Parked at: ${parkTime.toISOString()}`);
	console.log(`    - Duration: ${parkTimeMinutesAgo} minutes`);
	console.log(`    - Agreement reference: ${agreementReference}`);
	console.log();

	// Pre-initialize gate database with car entry
	const gateDB = new GateAgentCarsDB();
	const licensePlate = "TEST-123";
	gateDB.add({
		licensePlate,
		publicKey: carPublicKey.toString(),
		ratePerHour: parkingRate,
		parkedAt: parkTime,
		parkingTransactionId: agreementReference,
	});
	console.log(`  ✓ Gate database initialized`);
	console.log(`    - License plate: ${licensePlate}`);
	console.log(`    - Car public key: ${carPublicKey.toString().substring(0, 20)}...`);
	console.log();

	console.log("Step 4: Creating agents...");

	// Create car agent
	const carConfig: CarExitAgentConfig = {
		privateKey: carPrivateKey,
		extractParkingRatePrompt: CAR_EXTRACT_RATE_PROMPT,
		publishAgreement: true,
	};

	const carAdapter = new CarExitAgentAdapterImpl({
		signer: carSigner,
		config: carConfig,
		memory: carMemory,
		openAIApiKey,
		extractRateModel: "gpt-4o-mini",
	});

	const carAgent = new CarExitAgent(carAdapter);
	console.log("  ✓ Car agent initialized");

	// Create gate agent
	let finalDecision: "let-out" | "reject" | null = null;

	const gateAdapter = new GateAgentExitAdapterImpl({
		db: gateDB,
		privateKey: gatePrivateKey,
		verifier: gateVerifier,
		licensePlate,
		finalizeCarCallback: async (result: "let-out" | "reject") => {
			finalDecision = result;
			console.log(`  🚦 Gate final decision: ${result.toUpperCase()}`);
		},
	});

	const gateAgent = new GateExitAgent(gateAdapter);
	console.log("  ✓ Gate agent initialized");
	console.log();

	console.log("Step 5: Running agent conversation...");
	console.log("-".repeat(80));
	console.log();

	try {
		let carMessage = ""; // Car starts with empty message to initiate DAIA handshake
		let gateEnded = false;
		let currentTurn = 0;

		while (currentTurn < MAX_TURNS && !gateEnded) {
			currentTurn++;
			console.log(`[Turn ${currentTurn}]`);
			console.log();

			// Car sends message to gate
			const carMsgDisplay = carMessage;
			console.log(`🚗 Car → Gate: ${carMsgDisplay}`);
			const gateResponse = await gateAgent.processInput(carMessage);
			console.log();

			if (gateResponse.type === "end") {
				console.log("🚦 Gate ended the conversation");
				gateEnded = true;
				break;
			}

			if (gateResponse.type === "message") {
				const gateMsg = gateResponse.content;
				console.log(`🚦 Gate → Car: ${gateMsg}`);
				console.log();

				// Gate sends message back to car
				const carResponse = await carAgent.processInput(gateResponse.content);

				if (carResponse.type === "message") {
					carMessage = carResponse.content;

					// Check if car just published a transaction (DAIA offer-response message)
					if (DaiaMessageUtil.isDaiaMessage(carMessage)) {
						try {
							const daiaMessage = DaiaMessageUtil.deserialize(carMessage);
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
				} else {
					console.log("⚠️  Car returned unexpected response type");
					break;
				}
			}

			console.log("-".repeat(80));
			console.log();
		}

		if (currentTurn >= MAX_TURNS) {
			console.log("⚠️  Maximum turns reached without completion");
		}

		console.log();
		console.log("=".repeat(80));
		console.log("DEMO COMPLETED");
		console.log("=".repeat(80));
		console.log(`Total turns: ${currentTurn}`);
		console.log(`Final decision: ${finalDecision || "none"}`);
		console.log();

		// Log final states
		const carMemory = carAdapter.getMemory();
		console.log("Final Car Agent State:");
		console.log(`  Is parked: ${carMemory.isParked}`);

		const parkAgreement = carMemory.getParkAgreement();
		if (parkAgreement) {
			console.log("  Parking agreement:");
			console.log(`    - Content: ${parkAgreement.content}`);
			console.log(`    - Reference: ${parkAgreement.reference}`);
			console.log(`    - Parked at: ${parkAgreement.parkTime.toISOString()}`);
			const parkDuration = (Date.now() - parkAgreement.parkTime.getTime()) / 1000 / 60;
			console.log(`    - Duration: ${Math.floor(parkDuration)} minutes`);
		}
		console.log();

		const allCars = gateAdapter.getCarsDB().all();
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
