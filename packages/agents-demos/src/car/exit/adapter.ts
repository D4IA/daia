import { PublicKey } from "@daia/blockchain";
import { DaiaOfferSigner } from "@daia/core";
import { CarExitAgentConfig } from "./config";
import { CarAgentMemory } from "../db/memory";

export interface CarExitAgentAdapter {
	getPublicKey(): PublicKey;
	getSigner(): DaiaOfferSigner;
	getConfig(): CarExitAgentConfig;

	/**
	 * Method that extracts hourly parking rate as number from agreemnt using langchain LLM.
	 */
	calculateParkHourlyRate: (agreementText: string) => Promise<number>;

	getMemory(): CarAgentMemory;

	/**
	 * Log a message
	 */
	log(message: string): void;
}
