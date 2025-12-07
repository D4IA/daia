import { DaiaAgreementVerifier } from "@daia/core";
import { Message } from "../../car/enter";
import { PrivateKey, PublicKey } from "@daia/blockchain";
import { GateAgentCarsDB } from "../state/db";
import { GateAgentConversationResponse, GateAgentOfferData } from "../common";

export interface GateAgentEnterAdapter {
	getPublicKey(): PublicKey;
	getPrivateKey(): PrivateKey;
	getVerifier(): DaiaAgreementVerifier;
	getCarsDB(): GateAgentCarsDB;
	readLicensePlate(): Promise<string>;

	finalizeCar(result: "let-in" | "reject"): Promise<void>;

	runConversation(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<GateAgentConversationResponse>;

	runConversationTextOnly(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<string>;

	makeAnOffer(conversationHistory: ReadonlyArray<Message>): Promise<GateAgentOfferData>;

	/**
	 * Log a message
	 */
	log(message: string): void;
}
