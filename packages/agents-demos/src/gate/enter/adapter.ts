import { DaiaAgreementVerifier } from "@daia/core";
import { Message } from "../../car/enter";
import { PrivateKey, PublicKey } from "@daia/blockchain";
import { GateAgentCarsDB } from "../state/db";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod/v3";
import { GateAgentConversationResponse, GateAgentOfferData } from "../common";

export interface GateAgentEnterAdapter {
	getPublicKey(): PublicKey;
	getPrivateKey(): PrivateKey;
	getVerifier(): DaiaAgreementVerifier;
	getCarsDB(): GateAgentCarsDB;
	readLicensePlate(): Promise<string>;

	finalizeCar(result: "let-in" | "reject"): Promise<void>;

	runConversation(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<GateAgentConversationResponse>;

	runConversationTextOnly(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<string>;

	makeAnOffer(conversationHistory: ReadonlyArray<Message>): Promise<GateAgentOfferData>;

	/**
	 * Log a message
	 */
	log(message: string): void;
}

export class GateAgentEnterAdapterImpl implements GateAgentEnterAdapter {
	constructor(
		private readonly db: GateAgentCarsDB,
		private readonly publicKey: PublicKey,
		private readonly privateKey: PrivateKey,
		private readonly verifier: DaiaAgreementVerifier,
		private readonly licensePlate: string,
		private readonly openAIApiKey: string,
		private readonly conversingModel: string,
		private readonly conversingPrompt: string,
		private readonly offerGenerationModel: string,
		private readonly offerGenerationPrompt: string,
		private readonly finalizeCarCallback: (result: "let-in" | "reject") => Promise<void>,
	) {}

	log(message: string): void {
		// FIXME: put this in config like other adapters do
		console.log(`[GateAgentEnterAdapter] ${message}`);
	}

	getPublicKey(): PublicKey {
		return this.publicKey;
	}

	getPrivateKey(): PrivateKey {
		return this.privateKey;
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
		const ConversationResponseSchema = z.discriminatedUnion("type", [
			z.object({
				type: z.literal("text"),
				text: z.string().describe("The conversational response text"),
			}),
			z.object({
				type: z.literal("offer"),
				shouldMakeOffer: z.literal(true),
			}),
		]);

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

		return response;
	}

	async runConversationTextOnly(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<string> {
		const response = await this.runConversation(conversationHistory, userMessage);
		if (response.type === "text") {
			return response.text;
		}

		// Generate offer using separate LLM invocation
		const llm = new ChatOpenAI({
			model: this.offerGenerationModel,
			apiKey: this.openAIApiKey,
		});

		const prompt = [{ role: "system", content: this.offerGenerationPrompt }, ...conversationHistory];

		const offerResponse = await llm.invoke(
			prompt.map((msg) => ({ role: msg.role, content: msg.content })),
		);

		return offerResponse.content as string;
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
