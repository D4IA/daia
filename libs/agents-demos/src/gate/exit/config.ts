import { PrivateKey } from "@d4ia/blockchain-bridge";
import { DaiaAgreementVerifier } from "@d4ia/core";

export type GateExitAgentConfig = {
	privateKey: PrivateKey;

	verifier: DaiaAgreementVerifier;

	/**
	 * Callback function to finalize the car exit process.
	 */
	finalizeCarCallback: (result: "let-out" | "reject") => Promise<void>;

	/**
	 * Callback function for logging messages.
	 */
	logCallback: (message: string) => void;
};
