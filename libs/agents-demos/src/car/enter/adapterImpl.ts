import { ChatOpenAI } from "@langchain/openai";
import z from "zod/v3";
import { PublicKey } from "@d4ia/blockchain-bridge";
import { DaiaOfferSigner } from "@d4ia/core";
import type { CarEnterAgentAdapter, CarEnterAgentOfferDecision, Message } from "./adapter";
import { CarEnterAgentConfig } from "./config";
import { CarAgentMemory } from "../db/memory";

/**
 * Default implementation of CarEnterAgentAdapter that uses LangChain and OpenAI
 * for conversation and offer analysis.
 */
export class DefaultCarEnterAgentAdapter implements CarEnterAgentAdapter {
	private readonly publicKey: PublicKey;
	private readonly signer: DaiaOfferSigner;
	private readonly conversingPrompt: string;
	private readonly offerAnalysisPrompt: string;
	private readonly conversingModel: string;
	private readonly offerAnalysisModel: string;
	private readonly openAIApiKey: string;
	private readonly config: CarEnterAgentConfig;
	private readonly memory: CarAgentMemory;

	constructor(config: CarEnterAgentConfig) {
		this.publicKey = config.privateKey.toPublicKey();
		this.signer = config.signer;
		this.conversingPrompt = config.conversingPrompt;
		this.offerAnalysisPrompt = config.offerAnalysisPrompt;
		this.conversingModel = config.conversingModel;
		this.offerAnalysisModel = config.offerAnalysisModel;
		this.openAIApiKey = config.openAIApiKey;
		this.config = { ...config };
		this.memory = config.memory;
	}

	getPublicKey(): PublicKey {
		return this.publicKey;
	}

	getSigner(): DaiaOfferSigner {
		return this.signer;
	}

	getConfig(): CarEnterAgentConfig {
		return this.config;
	}

	getMemory(): CarAgentMemory {
		return this.memory;
	}

	async runConversation(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<string> {
		const llm = new ChatOpenAI({
			model: this.conversingModel,
			apiKey: this.openAIApiKey,
		});

		const prompt = [
			{ role: "system", content: this.conversingPrompt },
			...conversationHistory,
			{ role: "user" as const, content: userMessage },
		];

		const response = await llm.invoke(
			prompt.map((msg) => ({ role: msg.role, content: msg.content })),
		);

		return `${response.content}`;
	}

	async considerOffer(offerText: string): Promise<CarEnterAgentOfferDecision> {
		const OfferAnalysisSchema = z.object({
			result: z.enum(["ACCEPT", "REJECT"]).describe("The decision: ACCEPT or REJECT"),
			rationale: z
				.string()
				.nullable()
				.describe("Why the offer was rejected (only required if REJECT, otherwise null)"),
		});

		const llm = new ChatOpenAI({
			model: this.offerAnalysisModel,
			apiKey: this.openAIApiKey,
		}).withStructuredOutput(OfferAnalysisSchema);

		const prompt = [
			{ role: "system", content: this.offerAnalysisPrompt },
			{ role: "user" as const, content: offerText },
		];

		const analysis: z.infer<typeof OfferAnalysisSchema> = await llm.invoke(
			prompt.map((msg) => ({ role: msg.role, content: msg.content })),
		);

		if (analysis.result === "ACCEPT") {
			return {
				accepted: true,
			};
		} else {
			return {
				accepted: false,
				rationale: analysis.rationale || "No rationale provided",
			};
		}
	}

	log(message: string): void {
		this.config.logCallback(message);
	}
}
