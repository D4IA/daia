/**
 * DAIA Conversation Chain (Orchestrator)
 * 
 * Main chain that orchestrates the complete DAIA protocol flow.
 * Routes messages through different stages: PubKey Exchange → Negotiation → Agreement
 */

import {
  RunnableLambda,
  RunnableSequence,
  RunnableBranch,
} from "@langchain/core/runnables";
import { parseIncomingMessage } from "../utils/messageParser";
import { DaiaMessageType } from "../types/schemas";
import {
  createPubKeyExchangeChain,
  type PubKeyExchangeInput,
  type PubKeyExchangeOutput,
} from "./PubKeyExchangeChain";
import {
  createOfferNegotiationChain,
  type OfferNegotiationInput,
  type OfferNegotiationOutput,
} from "./OfferNegotiationChain";
import {
  createAgreementChain,
  type AgreementInput,
  type AgreementOutput,
} from "./AgreementChain";
import type { ConversationContext } from "../adapters/interfaces";

/**
 * Conversation state tracking
 */
export enum ConversationStage {
  PubKeyExchange = "pubkey_exchange",
  Negotiation = "negotiation",
  Agreement = "agreement",
  Done = "done",
}

export interface DaiaConversationState {
  stage: ConversationStage;
  remotePubKey: string | null;
  currentOffer: any | null;
  offerCount: number;
  isInitiator: boolean;
}

export interface DaiaConversationInput {
  message: string | null;
  state: DaiaConversationState;
  context: ConversationContext<any>;
}

export interface DaiaConversationOutput {
  outgoingMessage: string | null;
  newState: DaiaConversationState;
  shouldContinue: boolean;
  error?: string;
}

export interface DaiaConversationChainConfig {
  pubKeyChainConfig: any;
  offerChainConfig: any;
  agreementChainConfig: any;
}

/**
 * Creates the main DAIA conversation orchestrator chain
 */
export function createDaiaConversationChain(
  config: DaiaConversationChainConfig
): RunnableSequence<DaiaConversationInput, DaiaConversationOutput> {
  const pubKeyChain = createPubKeyExchangeChain(config.pubKeyChainConfig);
  const offerChain = createOfferNegotiationChain(config.offerChainConfig);
  const agreementChain = createAgreementChain(config.agreementChainConfig);

  // Step 1: Determine current stage from state and message
  const stageDetector = RunnableLambda.from(
    async (input: DaiaConversationInput) => {
      const { message, state } = input;

      // If we have a message, check its type to determine stage
      if (message) {
        const parsed = parseIncomingMessage(message);

        switch (parsed.type) {
          case DaiaMessageType.PubKeyRequest:
          case DaiaMessageType.PubKeyResponse:
            return {
              ...input,
              detectedStage: ConversationStage.PubKeyExchange,
            };
          case DaiaMessageType.Agreement:
            return { ...input, detectedStage: ConversationStage.Agreement };
          case DaiaMessageType.Offer:
            return { ...input, detectedStage: ConversationStage.Negotiation };
          default:
            // Natural language - use current state
            return { ...input, detectedStage: state.stage };
        }
      }

      // No message - use current state or default to pubkey exchange
      return {
        ...input,
        detectedStage:
          state.stage === ConversationStage.Done
            ? ConversationStage.Done
            : state.stage || ConversationStage.PubKeyExchange,
      };
    }
  );

  // Step 2: Route to appropriate sub-chain
  const router = RunnableBranch.from([
    [
      // Public Key Exchange Stage
      (input: any) =>
        input.detectedStage === ConversationStage.PubKeyExchange,
      RunnableLambda.from(
        async (input: any): Promise<DaiaConversationOutput> => {
          const pubKeyInput: PubKeyExchangeInput = {
            message: input.message,
            role: input.state.isInitiator ? "initiator" : "responder",
          };

          const result: PubKeyExchangeOutput = await pubKeyChain.invoke(
            pubKeyInput
          );

          const newState = { ...input.state };
          if (result.remotePubKey) {
            newState.remotePubKey = result.remotePubKey;
          }
          if (result.isComplete) {
            newState.stage = ConversationStage.Negotiation;
          }

          return {
            outgoingMessage: result.outgoingMessage,
            newState,
            shouldContinue: !result.isComplete,
            error: result.error,
          };
        }
      ),
    ],
    [
      // Negotiation Stage
      (input: any) => input.detectedStage === ConversationStage.Negotiation,
      RunnableLambda.from(
        async (input: any): Promise<DaiaConversationOutput> => {
          const offerInput: OfferNegotiationInput = {
            message: input.message,
            role: input.state.isInitiator ? "recipient" : "offerer",
            context: input.context,
          };

          const result: OfferNegotiationOutput = await offerChain.invoke(
            offerInput
          );

          const newState = { ...input.state };
          newState.offerCount = result.offerCount;

          if (result.offer) {
            newState.currentOffer = result.offer;
          }

          if (result.accepted) {
            newState.stage = ConversationStage.Agreement;
          } else if (result.rejected && result.isDone) {
            newState.stage = ConversationStage.Done;
          }

          return {
            outgoingMessage: result.outgoingMessage,
            newState,
            shouldContinue: !result.isDone,
            error: result.error,
          };
        }
      ),
    ],
    [
      // Agreement Stage
      (input: any) => input.detectedStage === ConversationStage.Agreement,
      RunnableLambda.from(
        async (input: any): Promise<DaiaConversationOutput> => {
          const agreementInput: AgreementInput = {
            message: input.message,
            offer: input.state.currentOffer,
            role: input.state.isInitiator ? "signer" : "verifier",
          };

          const result: AgreementOutput = await agreementChain.invoke(
            agreementInput
          );

          const newState = { ...input.state };
          if (result.isDone) {
            newState.stage = ConversationStage.Done;
          }

          return {
            outgoingMessage: result.outgoingMessage,
            newState,
            shouldContinue: false, // Agreement is final
            error: result.error,
          };
        }
      ),
    ],
    // Default: Done or unknown
    RunnableLambda.from(
      (input: any): DaiaConversationOutput => ({
        outgoingMessage: null,
        newState: { ...input.state, stage: ConversationStage.Done },
        shouldContinue: false,
      })
    ),
  ]);

  return RunnableSequence.from([stageDetector, router]);
}
