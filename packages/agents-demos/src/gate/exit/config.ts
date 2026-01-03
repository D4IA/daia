import { PrivateKey } from "@daia/blockchain";
import { DaiaAgreementVerifier } from "@daia/core";

export type GateExitAgentConfig = {
	privateKey: PrivateKey;

	verifier: DaiaAgreementVerifier;

	/**
	 * Callback function to finalize the car exit process.
	 */
	finalizeCarCallback: (result: "let-out" | "reject") => Promise<void>;
};
