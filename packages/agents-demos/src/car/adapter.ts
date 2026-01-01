import { PublicKey } from "@daia/blockchain";
import { DaiaOfferSigner } from "@daia/core";

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
export type CarAgentOfferDecision = 
	| { accepted: true }
	| { accepted: false; rationale: string };

/**
 * Adapter interface for CarAgent that abstracts away LLM implementation details.
 * This interface provides high-level operations without exposing underlying
 * LLM frameworks, prompts, or API keys.
 * 
 * The adapter is a pure LLM wrapper - it does not manage state.
 * State management is the responsibility of the caller.
 */
export interface CarAgentAdapter {
	/**
	 * Get the public key that identifies this agent
	 */
	getPublicKey(): PublicKey;

	/**
	 * Get the signer for blockchain operations
	 */
	getSigner(): DaiaOfferSigner;

	/**
	 * Generate a conversational response based on conversation history.
	 * This is a pure function that does not manage state.
	 * 
	 * @param conversationHistory Array of previous messages in the conversation
	 * @param userMessage The new message from the user
	 * @returns The assistant's response as a string
	 */
	runConversation(
		conversationHistory: ReadonlyArray<Message>,
		userMessage: string,
	): Promise<string>;

	/**
	 * Analyze an offer and decide whether to accept or reject it.
	 * This is a pure function that does not manage state.
	 * 
	 * @param offerText Natural language description of the offer
	 * @returns Decision (accept or reject with rationale)
	 */
	considerOffer(
		offerText: string,
	): Promise<CarAgentOfferDecision>;
}
