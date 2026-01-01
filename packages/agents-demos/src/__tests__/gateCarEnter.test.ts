/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, BsvTransactionFactory, BsvTransactionParser, BsvNetwork } from "@daia/blockchain";
import type {
	BlockchainTransactionParser,
	ParsedBlockchainTransactionHandle,
	UtxoProvider,
	UTXO,
	PublicKey,
} from "@daia/blockchain";
import {
	DefaultDaiaOfferSigner,
	DefaultDaiaSignRequirementResolver,
	DefaultDaiaPaymentRequirementResolver,
	DefaultDaiaAgreementVerifier,
	type DaiaOfferSigner,
	type DaiaAgreementVerifier,
} from "@daia/core";
import { GateAgent } from "../gate/enter/agent";
import { CarEnterAgent } from "../car/agent";
import { createCarAgentGraph } from "../car/graph";
import { initialCarEnterAgentState } from "../car/state";
import type { GateAgentEnterAdapter, GateAgentConversationResponse, GateAgentOfferData } from "../gate/enter/adapter";
import type { CarAgentAdapter, CarAgentOfferDecision, Message } from "../car/adapter";
import { GateAgentCarsDB } from "../gate/state/db";

// Import Transaction and P2PKH from @bsv/sdk
import { Transaction, P2PKH } from "@bsv/sdk";

// Mock UtxoProvider - provides fake UTXOs without hitting the network
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
		const tx = new Transaction();
		const tempKey = PrivateKey.fromRandom();
		tx.addOutput({
			lockingScript: new P2PKH().lock(tempKey.toPublicKey().toHash() as number[]),
			satoshis: 100000,
		});
		return tx;
	}
}

// Mock BlockchainTransactionParser - stores transactions in-memory without network access
class MockBlockchainTransactionParser implements BlockchainTransactionParser {
	private transactions = new Map<string, ParsedBlockchainTransactionHandle>();
	private readonly realParser: BsvTransactionParser;

	constructor(network: BsvNetwork) {
		this.realParser = new BsvTransactionParser(network);
	}

	async findTransactionById(id: string): Promise<ParsedBlockchainTransactionHandle | null> {
		return this.transactions.get(id) ?? null;
	}

	async parseTransaction(serializedTransaction: string): Promise<ParsedBlockchainTransactionHandle> {
		// Use real parser to parse the transaction
		const handle = await this.realParser.parseTransaction(serializedTransaction);
		// Store it in-memory for later retrieval
		this.transactions.set(handle.id, handle);
		return handle;
	}

	async storeTransaction(handle: ParsedBlockchainTransactionHandle): Promise<void> {
		this.transactions.set(handle.id, handle);
	}
}

// Mock Gate Adapter - scripted responses for testing
class MockGateAdapter implements GateAgentEnterAdapter {
	private conversationCount = 0;
	private carsDB = new GateAgentCarsDB();

	constructor(
		private publicKey: PublicKey,
		private verifier: DaiaAgreementVerifier,
	) {}

	getPublicKey(): PublicKey {
		return this.publicKey;
	}

	getVerifier(): DaiaAgreementVerifier {
		return this.verifier;
	}

	getCarsDB(): GateAgentCarsDB {
		return this.carsDB;
	}

	async readLicensePlate(): Promise<string> {
		return "TEST-123";
	}

	async finalizeCar(_result: "let-in" | "reject"): Promise<void> {
		// No-op for testing
	}

	async runConversation(
		_conversationHistory: ReadonlyArray<Message>,
		_userMessage: string,
	): Promise<GateAgentConversationResponse> {
		this.conversationCount++;
		
		// First interaction: respond with text
		if (this.conversationCount === 1) {
			return {
				type: "text",
				text: "Welcome! I understand you'd like to park here. Let me prepare an offer for you.",
			};
		}
		
		// Second interaction: create offer
		return {
			type: "offer",
			offer: "Parking services are offered at a rate of 100 satoshis per hour.",
		};
	}

	async runConversationTextOnly(
		_conversationHistory: ReadonlyArray<Message>,
		_userMessage: string,
	): Promise<string> {
		return "Thank you for your response.";
	}

	async makeAnOffer(_conversationHistory: ReadonlyArray<Message>): Promise<GateAgentOfferData> {
		return {
			ratePerHour: 100,
		};
	}
}

// Mock Car Adapter - scripted responses for testing
class MockCarAdapter implements CarAgentAdapter {
	constructor(
		private publicKey: PublicKey,
		private signer: DaiaOfferSigner,
		private parser: MockBlockchainTransactionParser,
	) {}

	getPublicKey(): PublicKey {
		return this.publicKey;
	}

	getSigner(): DaiaOfferSigner {
		// Wrap the signer to store transactions in the parser after signing
		const originalSignOffer = this.signer.signOffer.bind(this.signer);
		const originalSummarizeOffer = this.signer.summarizeOffer.bind(this.signer);
		const originalSummarizeOfferContents = this.signer.summarizeOfferContents.bind(this.signer);
		
		return {
			summarizeOffer: originalSummarizeOffer,
			summarizeOfferContents: originalSummarizeOfferContents,
			signOffer: async (request) => {
				const result = await originalSignOffer(request);
				if (result.type === "success") {
					// Store the transaction in the parser so the verifier can find it
					const serializedTx = result.transaction.serializedTransaction();
					const parsed = await this.parser.parseTransaction(serializedTx);
					await this.parser.storeTransaction(parsed);
				}
				return result;
			},
		};
	}

	async runConversation(
		conversationHistory: ReadonlyArray<Message>,
		_userMessage: string,
	): Promise<string> {
		// Initial greeting after identity exchange
		if (conversationHistory.length === 0) {
			return "Hello! I'm a car looking to enter the parking facility.";
		}
		return "That sounds good to me.";
	}

	async considerOffer(_offerText: string): Promise<CarAgentOfferDecision> {
		// Always accept offers in this test
		return { accepted: true };
	}
}

describe("Gate-Car Agent Conversation Integration Test", () => {
	let gatePrivateKey: PrivateKey;
	let carPrivateKey: PrivateKey;
	let mockParser: MockBlockchainTransactionParser;
	let gateVerifier: DefaultDaiaAgreementVerifier;
	let carSigner: DefaultDaiaOfferSigner;
	let gateAdapter: MockGateAdapter;
	let carAdapter: MockCarAdapter;
	let gateAgent: GateAgent;
	let carAgent: CarEnterAgent;

	beforeEach(() => {
		// Generate keys
		gatePrivateKey = PrivateKey.fromRandom();
		carPrivateKey = PrivateKey.fromRandom();

		// Create mock blockchain infrastructure
		const network = BsvNetwork.TEST;
		mockParser = new MockBlockchainTransactionParser(network);
		const mockUtxoProvider = new MockUtxoProvider();

		// Create car's transaction factory and signer
		const carFactory = new BsvTransactionFactory(carPrivateKey, network, 1, mockUtxoProvider);
		const signResolver = new DefaultDaiaSignRequirementResolver(carPrivateKey);
		const paymentResolver = new DefaultDaiaPaymentRequirementResolver(carFactory);
		carSigner = new DefaultDaiaOfferSigner({
			transactionFactory: carFactory,
			signResolver,
			paymentResolver,
		});

		// Create gate's verifier
		gateVerifier = new DefaultDaiaAgreementVerifier(mockParser);

		// Create mock adapters
		gateAdapter = new MockGateAdapter(gatePrivateKey.toPublicKey(), gateVerifier);
		carAdapter = new MockCarAdapter(carPrivateKey.toPublicKey(), carSigner, mockParser);

		// Create agents
		gateAgent = new GateAgent(gateAdapter);
		
		// Create car agent but rebuild its graph with our mock adapter
		const tempConfig = {
			privateKey: carPrivateKey,
			conversingPrompt: "",
			offerAnalysisPrompt: "",
			conversingModel: "",
			offerAnalysisModel: "",
			openAIApiKey: "",
			signer: carSigner,
		};
		carAgent = new CarEnterAgent(tempConfig);
		
		// Replace the adapter and rebuild the graph with it
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(carAgent as any).adapter = carAdapter;
		const graphBuilder = createCarAgentGraph(carAdapter);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(carAgent as any).graph = graphBuilder.compile();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(carAgent as any).state = { ...initialCarEnterAgentState };
	});

	it("should successfully negotiate a parking agreement between car and gate", async () => {
		const MAX_TURNS = 10;
		let currentTurn = 0;
		let carMessage = "";
		let gateEnded = false;

		// Start conversation loop
		while (currentTurn < MAX_TURNS && !gateEnded) {
			currentTurn++;

			// Car sends message to gate
			const gateResponse = await gateAgent.processInput(carMessage);
			
			if (gateResponse.type === "end") {
				gateEnded = true;
				break;
			}

			// Gate sends message back to car
			if (gateResponse.type === "message") {
				const carResponse = await carAgent.processInput(gateResponse.content);
				if (carResponse.type === "message") {
					carMessage = carResponse.content;
				}
			}
		}

		// Verify conversation completed successfully
		expect(gateEnded).toBe(true);
		expect(currentTurn).toBeLessThan(MAX_TURNS);

		// Verify gate accepted the car
		const gateState = gateAgent.getState();
		expect(gateState.output.type).toBe("accept-client");

		// Verify car was added to database
		const carsDB = gateAdapter.getCarsDB();
		const allCars = carsDB.all();
		expect(allCars.length).toBe(1);
		expect(allCars[0]?.data.licensePlate).toBe("TEST-123");
		expect(allCars[0]?.data.ratePerHour).toBe(100);
	});
});
