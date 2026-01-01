import { ChatOpenAI } from "@langchain/openai";
import z from "zod/v3";
import { PublicKey } from "@daia/blockchain";
import { DaiaOfferSigner } from "@daia/core";
import type { CarAgentAdapter, CarAgentOfferDecision, Message } from "./adapter";
import { CarAgentConfig } from "./config";

/**
 * Default implementation of CarAgentAdapter that uses LangChain and OpenAI
 * for conversation and offer analysis.
 */
export class DefaultCarAgentAdapter implements CarAgentAdapter {
	private readonly publicKey: PublicKey;
	private readonly signer: DaiaOfferSigner;
	private readonly conversingPrompt: string;
	private readonly offerAnalysisPrompt: string;
	private readonly conversingModel: string;
	private readonly offerAnalysisModel: string;
	private readonly openAIApiKey: string;

	constructor(config: CarAgentConfig) {
		this.publicKey = config.privateKey.toPublicKey();
		this.signer = config.signer;
		this.conversingPrompt = config.conversingPrompt;
		this.offerAnalysisPrompt = config.offerAnalysisPrompt;
		this.conversingModel = config.conversingModel;
		this.offerAnalysisModel = config.offerAnalysisModel;
		this.openAIApiKey = config.openAIApiKey;
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
		const llm = new ChatOpenAI({
			model: this.conversingModel,
			apiKey: this.openAIApiKey,
		});

		const prompt = [
			{ role: "system", content: this.conversingPrompt },
			...conversationHistory,
			{ role: "user" as const, content: userMessage },
		];

		const response = await llm.invoke(prompt.map((msg) => ({ role: msg.role, content: msg.content })));

		return `${response.content}`;
	}

	async considerOffer(
		offerText: string,
	): Promise<CarAgentOfferDecision> {
		const OfferAnalysisSchema = z.discriminatedUnion("result", [
			z.object({
				result: z.literal("ACCEPT"),
			}),
			z.object({
				result: z.literal("REJECT"),
				rationale: z.string().describe("Why the offer was rejected"),
			}),
		]);

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
				rationale: analysis.rationale,
			};
		}
	}
}
