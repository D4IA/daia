import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateKey, PublicKey } from "@daia/blockchain";
import { DaiaOfferSigner } from "@daia/core";
import { CarEnterAgentAdapter, Message } from "./adapter";
import { DefaultCarEnterAgentAdapter } from "./adapterImpl";
import { CarEnterAgentConfig } from "./config";
import { ChatOpenAI } from "@langchain/openai";

// Mock OpenAI ChatOpenAI
vi.mock("@langchain/openai", () => ({
	ChatOpenAI: vi.fn(),
}));

describe("DefaultCarEnterAgentAdapter", () => {
	let mockPrivateKey: PrivateKey;
	let mockPublicKey: PublicKey;
	let mockSigner: DaiaOfferSigner;
	let config: CarEnterAgentConfig;
	let adapter: DefaultCarEnterAgentAdapter;

	beforeEach(() => {
		// Create mock private key
		mockPrivateKey = PrivateKey.fromRandom();
		mockPublicKey = mockPrivateKey.toPublicKey();

		// Create mock signer
		mockSigner = {
			signOffer: vi.fn(),
			summarizeOffer: vi.fn(),
			createOffer: vi.fn(),
		} as unknown as DaiaOfferSigner;

		// Create config
		config = {
			privateKey: mockPrivateKey,
			signer: mockSigner,
			conversingPrompt: "You are a helpful car rental agent",
			offerAnalysisPrompt: "Analyze the following offer",
			conversingModel: "gpt-4",
			offerAnalysisModel: "gpt-4",
			openAIApiKey: "test-api-key",
			shouldPublishTransactions: false,
		};

		adapter = new DefaultCarEnterAgentAdapter(config);

		// Clear mocks
		vi.clearAllMocks();
	});

	describe("getPublicKey", () => {
		it("should return the public key derived from private key", () => {
			const publicKey = adapter.getPublicKey();
			expect(publicKey).toBeDefined();
			expect(publicKey.toString()).toBe(mockPublicKey.toString());
		});

		it("should return the same public key on multiple calls", () => {
			const pk1 = adapter.getPublicKey();
			const pk2 = adapter.getPublicKey();
			expect(pk1.toString()).toBe(pk2.toString());
		});
	});

	describe("getSigner", () => {
		it("should return the configured signer", () => {
			const signer = adapter.getSigner();
			expect(signer).toBe(mockSigner);
		});
	});

	describe("runConversation", () => {
		it("should call ChatOpenAI with correct parameters", async () => {
			const mockInvoke = vi.fn().mockResolvedValue({ content: "It costs $50 per day" });
			vi.mocked(ChatOpenAI).mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						withStructuredOutput: vi.fn().mockReturnThis(),
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const conversationHistory: Message[] = [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there!" },
			];

			const userMessage = "How much does it cost?";
			const result = await adapter.runConversation(conversationHistory, userMessage);

			expect(ChatOpenAI).toHaveBeenCalledWith({
				model: config.conversingModel,
				apiKey: config.openAIApiKey,
			});
			expect(mockInvoke).toHaveBeenCalledTimes(1);
			expect(result).toBe("It costs $50 per day");
		});

		it("should handle empty message", async () => {
			const mockInvoke = vi.fn().mockResolvedValue({ content: "How can I help you?" });
			vi.mocked(ChatOpenAI).mockImplementation(
				() =>
					({
						invoke: mockInvoke,
						withStructuredOutput: vi.fn().mockReturnThis(),
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const result = await adapter.runConversation([], "");

			expect(result).toBe("How can I help you?");
		});
	});

	describe("considerOffer", () => {
		it("should call ChatOpenAI with structured output and return accepted decision", async () => {
			const mockInvoke = vi.fn().mockResolvedValue({ result: "ACCEPT" });
			const mockWithStructuredOutput = vi.fn().mockReturnValue({ invoke: mockInvoke });
			vi.mocked(ChatOpenAI).mockImplementation(
				() =>
					({
						invoke: vi.fn(),
						withStructuredOutput: mockWithStructuredOutput,
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const offerText = "I offer you $100 for the car rental";

			const decision = await adapter.considerOffer(offerText);

			expect(ChatOpenAI).toHaveBeenCalledWith({
				model: config.offerAnalysisModel,
				apiKey: config.openAIApiKey,
			});
			expect(mockWithStructuredOutput).toHaveBeenCalledTimes(1);
			expect(mockInvoke).toHaveBeenCalledTimes(1);
			expect(decision.accepted).toBe(true);
		});

		it("should return rejected decision with rationale", async () => {
			const mockInvoke = vi.fn().mockResolvedValue({ result: "REJECT", rationale: "Price too low" });
			const mockWithStructuredOutput = vi.fn().mockReturnValue({ invoke: mockInvoke });
			vi.mocked(ChatOpenAI).mockImplementation(
				() =>
					({
						invoke: vi.fn(),
						withStructuredOutput: mockWithStructuredOutput,
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const offerText = "I offer you $10 for the car rental";

			const decision = await adapter.considerOffer(offerText);

			expect(decision.accepted).toBe(false);
			if (!decision.accepted) {
				expect(decision.rationale).toBe("Price too low");
			}
		});

		it("should handle complex offer text", async () => {
			const mockInvoke = vi.fn().mockResolvedValue({ result: "ACCEPT" });
			const mockWithStructuredOutput = vi.fn().mockReturnValue({ invoke: mockInvoke });
			vi.mocked(ChatOpenAI).mockImplementation(
				() =>
					({
						invoke: vi.fn(),
						withStructuredOutput: mockWithStructuredOutput,
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const offerText =
				"I would like to rent your Tesla Model 3 for 5 days starting next Monday. I can pay $500 total.";

			const decision = await adapter.considerOffer(offerText);

			expect(decision.accepted).toBe(true);
		});
	});

	describe("integration", () => {
		it("should handle both conversation and offer consideration independently", async () => {
			// Mock for conversation
			const mockConvoInvoke = vi.fn().mockResolvedValue({ content: "Hi!" });
			vi.mocked(ChatOpenAI).mockImplementationOnce(
				() =>
					({
						invoke: mockConvoInvoke,
						withStructuredOutput: vi.fn().mockReturnThis(),
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const response = await adapter.runConversation([], "Hello");
			expect(response).toBe("Hi!");

			// Mock for offer consideration
			const mockOfferInvoke = vi.fn().mockResolvedValue({ result: "ACCEPT" });
			const mockWithStructuredOutput = vi.fn().mockReturnValue({ invoke: mockOfferInvoke });
			vi.mocked(ChatOpenAI).mockImplementationOnce(
				() =>
					({
						invoke: vi.fn(),
						withStructuredOutput: mockWithStructuredOutput,
					}) as unknown as InstanceType<typeof ChatOpenAI>,
			);

			const decision = await adapter.considerOffer("$100 offer");
			expect(decision.accepted).toBe(true);
		});
	});

	describe("interface compliance", () => {
		it("should not expose LLM-specific configuration through public interface", () => {
			// The adapter interface should not leak implementation details
			// Private fields are accessible in TypeScript but should not be part of the public API

			// Only these methods should be part of the public interface
			expect(typeof adapter.getPublicKey).toBe("function");
			expect(typeof adapter.getSigner).toBe("function");
			expect(typeof adapter.runConversation).toBe("function");
			expect(typeof adapter.considerOffer).toBe("function");

			// Verify the adapter follows the interface contract
			const adapterAsInterface: CarEnterAgentAdapter = adapter;
			expect(adapterAsInterface.getPublicKey).toBeDefined();
			expect(adapterAsInterface.getSigner).toBeDefined();
			expect(adapterAsInterface.runConversation).toBeDefined();
			expect(adapterAsInterface.considerOffer).toBeDefined();
		});
	});
});
