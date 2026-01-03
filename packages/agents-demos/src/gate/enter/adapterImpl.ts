import { ChatOpenAI } from "@langchain/openai";
import z from "zod/v3";
import { DaiaAgreementVerifier } from "@daia/core";
import { PrivateKey, PublicKey } from "@daia/blockchain";
import { GateAgentCarsDB } from "../state/db";
import { Message } from "../../car/enter";
import type { GateAgentEnterAdapter } from "./adapter";
import type { GateAgentConversationResponse, GateAgentOfferData } from "../common/types";

export interface GateAgentEnterAdapterConfig {
	db: GateAgentCarsDB;
	privateKey: PrivateKey;
	verifier: DaiaAgreementVerifier;
	licensePlate: string;
	openAIApiKey: string;
	conversingModel: string;
	conversingPrompt: string;
	offerGenerationModel: string;
	offerGenerationPrompt: string;
	finalizeCarCallback: (result: "let-in" | "reject") => Promise<void>;
}

/**
 * Default implementation of GateAgentEnterAdapter that uses LangChain and OpenAI
 * for conversation and offer generation.
 */
export class GateAgentEnterAdapterImpl implements GateAgentEnterAdapter {
	private readonly db: GateAgentCarsDB;
	private readonly privateKey: PrivateKey;
	private readonly verifier: DaiaAgreementVerifier;
	private readonly licensePlate: string;
	private readonly openAIApiKey: string;
	private readonly conversingModel: string;
	private readonly conversingPrompt: string;
	private readonly offerGenerationModel: string;
	private readonly offerGenerationPrompt: string;
	private readonly finalizeCarCallback: (result: "let-in" | "reject") => Promise<void>;

	constructor(config: GateAgentEnterAdapterConfig) {
		this.db = config.db;
		this.privateKey = config.privateKey;
		this.verifier = config.verifier;
		this.licensePlate = config.licensePlate;
		this.openAIApiKey = config.openAIApiKey;
		this.conversingModel = config.conversingModel;
		this.conversingPrompt = config.conversingPrompt;
		this.offerGenerationModel = config.offerGenerationModel;
		this.offerGenerationPrompt = config.offerGenerationPrompt;
		this.finalizeCarCallback = config.finalizeCarCallback;
	}
	getPrivateKey(): PrivateKey {
		return this.privateKey;
	}

	getPublicKey(): PublicKey {
		return this.getPrivateKey().toPublicKey();
	}

	getVerifier(): DaiaAgreementVerifier {
		return this.verifier;
	}

	getCarsDB(): GateAgentCarsDB {
		return this.db;
	}

	async readLicensePlate(): Promise<string> {
		return this.licensePlate;
	}

	async finalizeCar(result: "let-in" | "reject"): Promise<void> {
		await this.finalizeCarCallback(result);
	}

	async runConversation(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<GateAgentConversationResponse> {
		const ConversationResponseSchema = z.object({
			type: z
				.enum(["text", "offer"])
				.describe("Response type: 'text' for conversation or 'offer' to make an offer"),
			text: z
				.string()
				.nullable()
				.describe("The conversational response text (required if type is 'text', otherwise null)"),
		});

		const llm = new ChatOpenAI({
			model: this.conversingModel,
			apiKey: this.openAIApiKey,
		}).withStructuredOutput(ConversationResponseSchema);

		const prompt = [
			{ role: "system", content: this.conversingPrompt },
			...conversationHistory,
			{ role: "user" as const, content: userMessage },
		];

		const response: z.infer<typeof ConversationResponseSchema> = await llm.invoke(
			prompt.map((msg) => ({ role: msg.role, content: msg.content })),
		);

		if (response.type === "offer") {
			return {
				type: "offer",
			};
		}

		return {
			type: "text",
			text: response.text || "I'm here to help you with parking.",
		};
	}

	async runConversationTextOnly(
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

	async makeAnOffer(conversationHistory: ReadonlyArray<Message>): Promise<GateAgentOfferData> {
		const OfferDataSchema = z.object({
			ratePerHour: z.number().describe("The parking rate in satoshis per hour"),
		});

		const llm = new ChatOpenAI({
			model: this.offerGenerationModel,
			apiKey: this.openAIApiKey,
		}).withStructuredOutput(OfferDataSchema);

		const prompt = [{ role: "system", content: this.offerGenerationPrompt }, ...conversationHistory];

		const offerData: z.infer<typeof OfferDataSchema> = await llm.invoke(
			prompt.map((msg) => ({ role: msg.role, content: msg.content })),
		);

		return offerData;
	}
}
