import { PublicKey } from "@d4ia/blockchain-bridge";
import { DaiaOfferSigner } from "@d4ia/core";
import { CarEnterAgentConfig } from "./config";
import { CarAgentMemory } from "../db/memory";

/**
 * Message in conversation history
 */
export type Message = {
	role: "user" | "assistant";
	content: string;
};

/**
 * Decision result from offer consideration
 */
export type CarEnterAgentOfferDecision =
	| { accepted: true }
	| { accepted: false; rationale: string };

/**
 * Adapter interface for CarEnterAgent that abstracts away LLM implementation details.
 * This interface provides high-level operations without exposing underlying
 * LLM frameworks, prompts, or API keys.
 *
 * The adapter is a pure LLM wrapper - it does not manage state.
 * State management is the responsibility of the caller.
 */
export interface CarEnterAgentAdapter {
	/**
	 * Get the public key that identifies this agent
	 */
	getPublicKey(): PublicKey;

	/**
	 * Get the signer for blockchain operations
	 */
	getSigner(): DaiaOfferSigner;

	/**
	 * Get the configuration
	 */
	getConfig(): CarEnterAgentConfig;

	getMemory(): CarAgentMemory;

	/**
	 * Generate a conversational response based on conversation history.
	 * This is a pure function that does not manage state.
	 *
	 * @param conversationHistory Array of previous messages in the conversation
	 * @param userMessage The new message from the user
	 * @returns The assistant's response as a string
	 */
	runConversation(conversationHistory: ReadonlyArray<Message>, userMessage: string): Promise<string>;

	/**
	 * Analyze an offer and decide whether to accept or reject it.
	 * This is a pure function that does not manage state.
	 *
	 * @param offerText Natural language description of the offer
	 * @param conversationHistory Array of previous messages in the conversation
	 * @returns Decision (accept or reject with rationale)
	 */
	considerOffer(
		offerText: string,
		conversationHistory: ReadonlyArray<Message>,
	): Promise<CarEnterAgentOfferDecision>;

	/**
	 * Log a message
	 */
	log(message: string): void;
}
