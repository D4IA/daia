import { PrivateKey, PublicKey } from "@d4ia/blockchain";
import { DaiaAgreementVerifier } from "@d4ia/core";
import { GateAgentCarsDB } from "../state/db";
import type { GateAgentExitAdapter } from "./adapter";
import { GateExitAgentConfig } from "./config";

export interface GateAgentExitAdapterImplConfig {
	db: GateAgentCarsDB;
	privateKey: PrivateKey;
	verifier: DaiaAgreementVerifier;
	licensePlate: string;
	finalizeCarCallback: (result: "let-out" | "reject") => Promise<void>;
	logCallback: (message: string) => void;
}

/**
 * Default implementation of GateAgentExitAdapter for exit gate operations.
 */
export class GateAgentExitAdapterImpl implements GateAgentExitAdapter {
	private readonly db: GateAgentCarsDB;
	private readonly config: GateExitAgentConfig;
	private readonly licensePlate: string;
	private readonly logCallback: (message: string) => void;

	constructor(config: GateAgentExitAdapterImplConfig) {
		this.db = config.db;
		this.licensePlate = config.licensePlate;
		this.logCallback = config.logCallback;
		this.config = {
			privateKey: config.privateKey,
			verifier: config.verifier,
			finalizeCarCallback: config.finalizeCarCallback,
			logCallback: config.logCallback,
		};
	}

	getPrivateKey(): PrivateKey {
		return this.config.privateKey;
	}

	getPublicKey(): PublicKey {
		return this.getPrivateKey().toPublicKey();
	}

	getVerifier(): DaiaAgreementVerifier {
		return this.config.verifier;
	}

	getCarsDB(): GateAgentCarsDB {
		return this.db;
	}

	getCarLicensePlate(): string {
		return this.licensePlate;
	}

	getConfig(): GateExitAgentConfig {
		return this.config;
	}

	async finalizeCar(result: "let-out" | "reject"): Promise<void> {
		await this.config.finalizeCarCallback(result);
	}

	log(message: string): void {
		this.logCallback(message);
	}
}
