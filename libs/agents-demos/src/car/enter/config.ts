import { PrivateKey } from "@d4ia/blockchain-bridge";
import { DaiaOfferSigner } from "@d4ia/core";
import { CarAgentMemory } from "../db/memory";

export type CarEnterAgentConfig = {
	privateKey: PrivateKey;

	conversingPrompt: string;
	offerAnalysisPrompt: string;

	conversingModel: string;
	offerAnalysisModel: string;
	openAIApiKey: string;

	signer: DaiaOfferSigner;

	memory: CarAgentMemory;

	/**
	 * Whether to publish transactions to the blockchain.
	 * Set to false for testing to avoid network calls.
	 */
	shouldPublishTransactions: boolean;

	/**
	 * Callback function for logging messages.
	 */
	logCallback: (message: string) => void;
};
