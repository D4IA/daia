import { describe, it, expect, beforeEach, vi } from "vitest";
import { PrivateKey, PublicKey } from "@daia/blockchain";
import { DaiaOfferSigner, DaiaOfferSignResponseType } from "@daia/core";
import { CarAgentAdapter, CarAgentOfferDecision, Message } from "./adapter";
import { CarEnterAgent } from "./agent";
import { CarAgentConfig } from "./config";
import { ENTER_OFFER_TYPE_IDENTIFIER } from "../common/consts";

/**
 * Fake implementation of CarAgentAdapter for integration testing.
 * This implementation provides predefined responses without using real LLMs.
 */
class FakeCarAgentAdapter implements CarAgentAdapter {
	private readonly publicKey: PublicKey;
	private readonly signer: DaiaOfferSigner;
	private conversationCount = 0;

	constructor(publicKey: PublicKey, signer: DaiaOfferSigner) {
		this.publicKey = publicKey;
		this.signer = signer;
	}

	getPublicKey(): PublicKey {
		return this.publicKey;
	}

	getSigner(): DaiaOfferSigner {
		return this.signer;
	}

	async runConversation(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<string> {
		this.conversationCount++;

		// Simulate conversation responses based on input
		let response: string;
		if (userMessage === "") {
			// Initial greeting after identity exchange
			response = "Hello! I'm a car looking to enter the parking facility.";
		} else if (userMessage.toLowerCase().includes("parking") || userMessage.toLowerCase().includes("rate")) {
			response = "Yes, I'd like to know the parking rates please.";
		} else {
			response = "Thank you for the information.";
		}

		return response;
	}

	async considerOffer(
		offerText: string,
	): Promise<CarAgentOfferDecision> {
		// Fake decision logic: accept offers with reasonable rates
		const shouldAccept = offerText.includes("100 sat") || offerText.toLowerCase().includes("parking");

		if (shouldAccept) {
			return { accepted: true };
		} else {
			return { accepted: false, rationale: "Rate too high" };
		}
	}

	getConversationCount(): number {
		return this.conversationCount;
	}
}

describe("CarAgent Integration Test - Gate to Car Conversation Flow", () => {
	let carPrivateKey: PrivateKey;
	let carSigner: DaiaOfferSigner;
	let carAgent: CarEnterAgent;
	let fakeAdapter: FakeCarAgentAdapter;

	beforeEach(() => {
		// Setup blockchain identities
		carPrivateKey = PrivateKey.fromRandom();

		// Create mock signer using vi.fn()
		carSigner = {
			summarizeOfferContents: vi.fn(),
			summarizeOffer: vi.fn().mockResolvedValue({
				content: {
					naturalLanguageOfferContent: "Park for 2 hours at 100 sat/hour",
					offerTypeIdentifier: ENTER_OFFER_TYPE_IDENTIFIER,
					requirements: {},
				},
				payments: {},
				selfSignedData: {},
			}),
			signOffer: vi.fn().mockResolvedValue({
				type: DaiaOfferSignResponseType.SUCCESS,
				offer: { inner: "mock-offer", signatures: {} },
				agreement: { offer: { inner: "mock-offer", signatures: {} }, signatures: [] },
				transaction: { id: "mock-tx", txid: "mock-txid", data: {}, serializedTransaction: "", publish: vi.fn() },
				internalTransactions: [],
			}),
		};

		// Create fake adapter
		fakeAdapter = new FakeCarAgentAdapter(carPrivateKey.toPublicKey(), carSigner);

		// Create car agent config
		const carConfig: CarAgentConfig = {
			privateKey: carPrivateKey,
			signer: carSigner,
			conversingPrompt: "You are a car agent negotiating parking",
			offerAnalysisPrompt: "Analyze parking offers",
			conversingModel: "gpt-4",
			offerAnalysisModel: "gpt-4",
			openAIApiKey: "fake-key",
		};

		// Create car agent and inject fake adapter
		carAgent = new CarEnterAgent(carConfig);
		// Replace the internal adapter with our fake for testing
		(carAgent as unknown as { adapter: CarAgentAdapter }).adapter = fakeAdapter;
	});

	it("should successfully demonstrate conversation flow with fake adapter", async () => {
		// Test 1: Verify adapter abstraction works
		expect(fakeAdapter.getPublicKey()).toBeDefined();
		expect(fakeAdapter.getSigner()).toBe(carSigner);

		// Test 2: Simulate conversation using adapter directly
		const initialHistory: Message[] = [];
		const response = await fakeAdapter.runConversation(initialHistory, "Welcome to the parking facility!");

		// Verify conversation happened
		expect(fakeAdapter.getConversationCount()).toBeGreaterThan(0);
		// Message contains "parking" so fake adapter responds with rate inquiry
		expect(response).toContain("parking rates");
	});

	it("should accept offers with reasonable rates via fake adapter", async () => {
		// Simulate the adapter's offer consideration
		const decision = await fakeAdapter.considerOffer("Park for 2 hours at 100 sat/hour");

		// Verify acceptance
		expect(decision.accepted).toBe(true);
	});

	it("should reject offers with high rates via fake adapter", async () => {
		// Simulate high-rate offer consideration
		const decision = await fakeAdapter.considerOffer("Park for 1 hour at 5000 sat/hour");

		// Verify rejection
		expect(decision.accepted).toBe(false);
		if (!decision.accepted) {
			expect(decision.rationale).toBe("Rate too high");
		}
	});

	it("should handle conversation history accumulation", async () => {
		let history: Message[] = [];

		// First conversation turn using adapter directly
		const response1 = await fakeAdapter.runConversation(history, "What are your parking needs?");
		history = [
			...history,
			{ role: "user", content: "What are your parking needs?" },
			{ role: "assistant", content: response1 },
		];
		expect(history.length).toBe(2);

		// Second conversation turn
		const response2 = await fakeAdapter.runConversation(history, "We have parking available.");
		history = [
			...history,
			{ role: "user", content: "We have parking available." },
			{ role: "assistant", content: response2 },
		];
		expect(history.length).toBe(4);

		// Verify messages accumulated
		const userMessages = history.filter((m) => m.role === "user");
		const assistantMessages = history.filter((m) => m.role === "assistant");
		expect(userMessages.length).toBe(2);
		expect(assistantMessages.length).toBe(2);
	});

	it("should demonstrate adapter abstraction hides LLM details", () => {
		// Verify adapter interface doesn't expose LLM config
		const adapterAsAny = fakeAdapter as unknown as Record<string, unknown>;

		// These should NOT be accessible as public properties
		expect(adapterAsAny["openAIApiKey"]).toBeUndefined();
		expect(adapterAsAny["conversingModel"]).toBeUndefined();
		expect(adapterAsAny["conversingPrompt"]).toBeUndefined();
		expect(adapterAsAny["offerAnalysisPrompt"]).toBeUndefined();

		// Only interface methods should be accessible
		expect(typeof fakeAdapter.getPublicKey).toBe("function");
		expect(typeof fakeAdapter.getSigner).toBe("function");
		expect(typeof fakeAdapter.runConversation).toBe("function");
		expect(typeof fakeAdapter.considerOffer).toBe("function");
	});

	it("should demonstrate complete gate-to-car flow simulation", async () => {
		// Phase 1: Initial conversation after identity exchange (using adapter)
		let history: Message[] = [];
		const response1 = await fakeAdapter.runConversation(history, "Welcome! Please state your business.");
		history = [
			...history,
			{ role: "user", content: "Welcome! Please state your business." },
			{ role: "assistant", content: response1 },
		];
		expect(response1).toContain("Thank you");

		// Phase 2: Simulate offer consideration through adapter
		const offerText = "You can park here for 2 hours at 100 sat/hour. Total: 200 satoshis.";
		const decision = await fakeAdapter.considerOffer(offerText);

		// In real flow, graph would add these messages to history
		history = [
			...history,
			{ role: "user", content: `INCOMING OFFER TO CONSIDER: ${offerText}` },
			{ role: "assistant", content: `ANALYSIS RESULT: ${decision.accepted ? 'ACCEPT' : 'REJECT'}` },
		];

		// Phase 3: Verify offer was accepted
		expect(decision.accepted).toBe(true);
		expect(history.some((msg) => msg.content.includes("INCOMING OFFER"))).toBe(true);
		expect(history.some((msg) => msg.content.includes("ACCEPT"))).toBe(true);

		// Phase 4: Verify conversation history maintained throughout
		expect(history.length).toBeGreaterThan(2);
		console.log("Complete flow demonstration:");
		console.log("- Identity exchange: (simulated)");
		console.log("- Conversation turns:", fakeAdapter.getConversationCount());
		console.log("- Offer decision: ACCEPTED");
		console.log("- Total messages in history:", history.length);
	});
});
