import { PrivateKey } from "@daia/blockchain";
import { DaiaOfferSigner } from "@daia/core";

export type CarAgentConfig = {
	privateKey: PrivateKey;

	conversingPrompt: string;
	offerAnalysisPrompt: string;

	conversingModel: string;
	offerAnalysisModel: string;
	openAIApiKey: string;

	signer: DaiaOfferSigner;
};
