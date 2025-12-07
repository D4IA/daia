import { PrivateKey } from "@daia/blockchain";
import { DaiaAgreementVerifier } from "@daia/core";

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
