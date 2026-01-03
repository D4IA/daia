import { PrivateKey } from "@daia/blockchain";

export type CarExitAgentConfig = {
	privateKey: PrivateKey;

	/**
	 * Prompt used to extract parking rates from agreement referenced.
	 */
	extractParkingRatePrompt: string;

	/**
	 * When true, agreement will be published to the blockchain.
	 */
	publishAgreement: boolean;
};
