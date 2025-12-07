import { PublicKey } from "@daia/blockchain";
import { DaiaOfferSigner } from "@daia/core";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod/v3";
import { CarAgentMemory } from "../db/memory";
import type { CarExitAgentAdapter } from "./adapter";
import { CarExitAgentConfig } from "./config";

export interface CarExitAgentAdapterImplConfig {
	signer: DaiaOfferSigner;
	config: CarExitAgentConfig;
	memory: CarAgentMemory;
	openAIApiKey: string;
	extractRateModel: string;
}

/**
 * Default implementation of CarExitAgentAdapter using LangChain for rate extraction.
 */
export class CarExitAgentAdapterImpl implements CarExitAgentAdapter {
	private readonly signer: DaiaOfferSigner;
	private readonly config: CarExitAgentConfig;
	private readonly memory: CarAgentMemory;
	private readonly openAIApiKey: string;
	private readonly extractRateModel: string;

	constructor(config: CarExitAgentAdapterImplConfig) {
		this.signer = config.signer;
		this.config = config.config;
		this.memory = config.memory;
		this.openAIApiKey = config.openAIApiKey;
		this.extractRateModel = config.extractRateModel;
	}

	getPublicKey(): PublicKey {
		return this.config.privateKey.toPublicKey();
	}

	getSigner(): DaiaOfferSigner {
		return this.signer;
	}

	getConfig(): CarExitAgentConfig {
		return this.config;
	}

	getMemory(): CarAgentMemory {
		return this.memory;
	}

	async calculateParkHourlyRate(agreementText: string): Promise<number> {
		const RateSchema = z.object({
			ratePerHour: z.number().describe("The parking rate in satoshis per hour"),
		});

		const llm = new ChatOpenAI({
			model: this.extractRateModel,
			apiKey: this.openAIApiKey,
		}).withStructuredOutput(RateSchema);

		const prompt = [
			{ role: "system", content: this.config.extractParkingRatePrompt },
			{ role: "user", content: agreementText },
		];

		const result: z.infer<typeof RateSchema> = await llm.invoke(prompt);

		return result.ratePerHour;
	}

	log(message: string): void {
		this.config.logCallback(message);
	}
}
