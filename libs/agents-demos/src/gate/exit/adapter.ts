import { PrivateKey, PublicKey } from "@d4ia/blockchain";
import { DaiaAgreementVerifier } from "@d4ia/core";
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
