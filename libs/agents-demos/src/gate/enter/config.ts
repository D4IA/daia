import { PrivateKey } from "@d4ia/blockchain-bridge";
import { DaiaAgreementVerifier } from "@d4ia/core";

export type GateAgentConfig = {
	privateKey: PrivateKey;

	conversingPrompt: string;
	offerGenerationPrompt: string;

	conversingModel: string;
	offerGenerationModel: string;
	openAIApiKey: string;

	verifier: DaiaAgreementVerifier;

	/**
	 * Callback function for logging messages.
	 */
	logCallback: (message: string) => void;
};
