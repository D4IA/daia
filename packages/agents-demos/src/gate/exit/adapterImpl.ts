import { PrivateKey, PublicKey } from "@daia/blockchain";
import { DaiaAgreementVerifier } from "@daia/core";
import { GateAgentCarsDB } from "../state/db";
import type { GateAgentExitAdapter } from "./adapter";
import { GateExitAgentConfig } from "./config";

export interface GateAgentExitAdapterImplConfig {
	db: GateAgentCarsDB;
	privateKey: PrivateKey;
	verifier: DaiaAgreementVerifier;
	licensePlate: string;
	finalizeCarCallback: (result: "let-out" | "reject") => Promise<void>;
}

/**
 * Default implementation of GateAgentExitAdapter for exit gate operations.
 */
export class GateAgentExitAdapterImpl implements GateAgentExitAdapter {
	private readonly db: GateAgentCarsDB;
	private readonly config: GateExitAgentConfig;
	private readonly licensePlate: string;

	constructor(config: GateAgentExitAdapterImplConfig) {
		this.db = config.db;
		this.licensePlate = config.licensePlate;
		this.config = {
			privateKey: config.privateKey,
			verifier: config.verifier,
			finalizeCarCallback: config.finalizeCarCallback,
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
}
