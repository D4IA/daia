import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, BsvTransactionFactory, BsvNetwork } from "@d4ia/blockchain";
import type { UtxoProvider, UTXO } from "@d4ia/blockchain";
import {
	DefaultDaiaOfferSigner,
	DefaultDaiaSignRequirementResolver,
	DefaultDaiaPaymentRequirementResolver,
	DaiaOfferBuilder,
	DaiaMessageUtil,
	DaiaMessageType,
	DaiaAgreementReferenceResult,
	type DaiaOfferMessage,
} from "@d4ia/core";
import { CarExitAgent } from "../agent";
import { CarExitAgentAdapter } from "../adapter";
import { CarExitAgentConfig } from "../config";
import { CarAgentMemory } from "../../db/memory";
import { EXIT_OFFER_TYPE_IDENTIFIER } from "../../../common/consts";

// Mock UTXO provider - provides fake UTXOs without network calls
class MockUtxoProvider implements UtxoProvider {
	async getUtxos(): Promise<UTXO[]> {
		return [
			{
				txid: "0000000000000000000000000000000000000000000000000000000000000001",
				vout: 0,
				satoshis: 100000,
				scriptPubKey: "76a914" + "00".repeat(20) + "88ac",
			},
		];
	}

	async getUtxosWithTotal(): Promise<UTXO[]> {
		return this.getUtxos();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async getSourceTransaction(): Promise<any> {
		// Import P2PKH from @bsv/sdk through blockchain's peer dependency
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { Transaction, P2PKH } = require("@bsv/sdk");
		const tx = new Transaction();
		const tempKey = PrivateKey.fromRandom();
		tx.addOutput({
			lockingScript: new P2PKH().lock(tempKey.toPublicKey().toHash() as number[]),
			satoshis: 100000,
		});
		return tx;
	}
}

// Mock adapter implementation
class TestCarExitAgentAdapter implements CarExitAgentAdapter {
	constructor(
		private readonly privateKey: PrivateKey,
		private readonly signer: DefaultDaiaOfferSigner,
		private readonly memory: CarAgentMemory,
		private readonly config: CarExitAgentConfig,
	) {}

	getPublicKey() {
		return this.privateKey.toPublicKey();
	}

	getSigner() {
		return this.signer;
	}

	getConfig() {
		return this.config;
	}

	async calculateParkHourlyRate(agreementText: string): Promise<number> {
		// Use regex to extract hourly rate from agreement text
		// Matches patterns like: "100 satoshis per hour", "100 sats per hour", etc.
		const regex = /(\d+(\.\d+)?)\s*satoshis?\s*per\s*hour/i;
		const match = agreementText.match(regex);

		if (!match) {
			throw new Error(`Could not extract parking rate from: ${agreementText}`);
		}

		return parseFloat(match[1]!);
	}

	getMemory() {
		return this.memory;
	}
}

// Helper function to perform DAIA_HELLO handshake between agent and gate
async function performHandshake(agent: CarExitAgent, gatePublicKey: string): Promise<void> {
	// Step 1: Agent sends initial DAIA_HELLO (when given empty input)
	const step1 = await agent.processInput("");
	if (step1.type !== "message") throw new Error("Expected message response");

	const helloMsg1 = DaiaMessageUtil.deserialize(step1.content);
	if (helloMsg1.type !== DaiaMessageType.DAIA_HELLO) {
		throw new Error(`Expected DAIA_HELLO, got ${helloMsg1.type}`);
	}

	// Step 2: Gate responds with its DAIA_HELLO
	const gateHello = DaiaMessageUtil.serialize({
		type: DaiaMessageType.DAIA_HELLO,
		publicKey: gatePublicKey,
	});

	const step2 = await agent.processInput(gateHello);
	if (step2.type !== "message") throw new Error("Expected message response");

	// After handshake, the agent should be ready to process offers
}

describe("CarExitAgent", () => {
	let carPrivateKey: PrivateKey;
	let gatePrivateKey: PrivateKey;
	let memory: CarAgentMemory;
	let adapter: CarExitAgentAdapter;
	let agent: CarExitAgent;

	beforeEach(() => {
		// Generate random keys
		carPrivateKey = PrivateKey.fromRandom();
		gatePrivateKey = PrivateKey.fromRandom();

		// Setup memory with parking state (parked 2 hours ago)
		memory = new CarAgentMemory();
		const parkTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
		const agreementContent = "Parking services are offered at a rate of 100 satoshis per hour.";
		const agreementReference = "mock-agreement-ref-123";
		memory.park(agreementContent, agreementReference, parkTime);

		// Create mock UTXO provider
		const mockUtxoProvider = new MockUtxoProvider();

		// Create real BSV transaction factory with mock UTXO provider
		const factory = new BsvTransactionFactory(carPrivateKey, BsvNetwork.TEST, 1, mockUtxoProvider);

		// Create real resolvers
		const signResolver = new DefaultDaiaSignRequirementResolver(carPrivateKey);
		const paymentResolver = new DefaultDaiaPaymentRequirementResolver(factory);

		// Create real signer
		const signer = new DefaultDaiaOfferSigner({
			transactionFactory: factory,
			signResolver,
			paymentResolver,
		});

		// Create config with publishAgreement: false
		const config: CarExitAgentConfig = {
			privateKey: carPrivateKey,
			extractParkingRatePrompt: "",
			publishAgreement: false,
		};

		// Create adapter
		adapter = new TestCarExitAgentAdapter(carPrivateKey, signer, memory, config);

		// Create agent
		agent = new CarExitAgent(adapter);
	});

	it("successfully processes exit with valid offer", async () => {
		// Step 1: Perform DAIA_HELLO handshake
		const gatePublicKey = gatePrivateKey.toPublicKey().toString();
		await performHandshake(agent, gatePublicKey);

		// Step 2: Gate creates an exit offer
		// Payment: 200 satoshis (2 hours * 100 satoshis/hour)
		const gateAddress = gatePrivateKey.toPublicKey().toAddress();
		const carPublicKey = carPrivateKey.toPublicKey().toString();

		const offer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier(EXIT_OFFER_TYPE_IDENTIFIER)
			.setNaturalLanguageContent("Payment of 200 satoshis for parking exit")
			.addSelfSignedRequirement(gatePrivateKey) // Gate self-signs
			.addSignRequirement(carPublicKey) // Car needs to sign
			.addPaymentRequirement(gateAddress, 200) // 200 satoshis payment
			.build();

		// Wrap offer in proper DAIA message structure
		const offerMessage: DaiaOfferMessage = {
			type: DaiaMessageType.OFFER,
			content: offer,
		};
		const offerInput = DaiaMessageUtil.serialize(offerMessage);

		// Step 3: Agent processes the offer
		const response = await agent.processInput(offerInput);

		// Step 4: Verify response is an acceptance with agreement
		expect(response.type).toBe("message");
		if (response.type === "message") {
			expect(response.content).toBeDefined();
			const msg = DaiaMessageUtil.deserialize(response.content);
			expect(msg.type).toBe(DaiaMessageType.OFFER_RESPONSE);
			if (msg.type === DaiaMessageType.OFFER_RESPONSE) {
				expect(msg.result).toBe(DaiaAgreementReferenceResult.ACCEPT);
			}
		}
	});

	it("rejects offer with wrong offer type identifier", async () => {
		// Step 1: Perform DAIA_HELLO handshake
		const gatePublicKey = gatePrivateKey.toPublicKey().toString();
		await performHandshake(agent, gatePublicKey);

		// Step 2: Gate creates an offer with WRONG offer type identifier
		const gateAddress = gatePrivateKey.toPublicKey().toAddress();
		const carPublicKey = carPrivateKey.toPublicKey().toString();

		const offer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("WRONG_OFFER_TYPE") // Wrong identifier
			.setNaturalLanguageContent("Payment of 200 satoshis for parking exit")
			.addSelfSignedRequirement(gatePrivateKey)
			.addSignRequirement(carPublicKey)
			.addPaymentRequirement(gateAddress, 200)
			.build();

		// Wrap offer in proper DAIA message structure
		const offerMessage: DaiaOfferMessage = {
			type: DaiaMessageType.OFFER,
			content: offer,
		};
		const offerInput = DaiaMessageUtil.serialize(offerMessage);

		// Step 3: Agent processes the offer - it should handle rejection gracefully
		const response = await agent.processInput(offerInput);

		// Step 4: Verify the agent rejected the offer
		if (response.type !== "message") throw new Error("Unexpected response type");
		const msg = DaiaMessageUtil.deserialize(response.content);
		if (msg.type !== DaiaMessageType.OFFER_RESPONSE) throw new Error("Unexpected message type");
		if (msg.result !== DaiaAgreementReferenceResult.REJECT)
			throw new Error("Offer was not rejected as expected");
	});
});
