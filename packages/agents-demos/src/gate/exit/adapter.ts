import { PrivateKey, PublicKey } from "@daia/blockchain";
import { DaiaAgreementVerifier } from "@daia/core";
import { GateAgentCarsDB } from "../state/db";
import { GateExitAgentConfig } from "./config";

export interface GateAgentExitAdapter {
	getPublicKey(): PublicKey;
	getPrivateKey(): PrivateKey;
	getVerifier(): DaiaAgreementVerifier;
	getCarsDB(): GateAgentCarsDB;
	getCarLicensePlate(): string;
	getConfig(): GateExitAgentConfig;

	finalizeCar(result: "let-out" | "reject"): Promise<void>;

	/**
	 * Log a message
	 */
	log(message: string): void;
}
