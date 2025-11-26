/**
 * Public Key Exchange Chain
 * 
 * Handles the DAIA public key exchange protocol using LangChain runnables.
 * Supports both initiator (requests key) and responder (provides key) roles.
 */

import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { AgentSigningAdapter } from "../adapters/signingAdapter";
import {
  parseIncomingMessage,
  formatPubKeyRequest,
  formatPubKeyResponse,
} from "../utils/messageParser";
import { DaiaMessageType } from "../types/schemas";

export interface PubKeyExchangeInput {
  message: string | null;
  role: "initiator" | "responder";
}

export interface PubKeyExchangeOutput {
  outgoingMessage: string | null;
  remotePubKey: string | null;
  isComplete: boolean;
  error?: string;
}

export interface PubKeyExchangeChainConfig {
  signingAdapter: AgentSigningAdapter;
  requestId?: string;
}

/**
 * Creates a chain that handles public key exchange
 */
export function createPubKeyExchangeChain(
  config: PubKeyExchangeChainConfig
): RunnableSequence<PubKeyExchangeInput, PubKeyExchangeOutput> {
  const { signingAdapter, requestId = "default" } = config;

  // Step 1: Parse incoming message
  const parseStep = RunnableLambda.from(
    async (input: PubKeyExchangeInput) => {
      if (!input.message) {
        return { ...input, parsed: null };
      }

      try {
        const parsed = parseIncomingMessage(input.message);
        return { ...input, parsed };
      } catch (error) {
        return {
          ...input,
          parsed: null,
          error: `Failed to parse message: ${error}`,
        };
      }
    }
  );

  // Step 2: Process based on role
  const processStep = RunnableLambda.from(
    async (input: any): Promise<PubKeyExchangeOutput> => {
      const { role, parsed, error } = input;

      if (error) {
        return {
          outgoingMessage: null,
          remotePubKey: null,
          isComplete: false,
          error,
        };
      }

      // Initiator: Send request or process response
      if (role === "initiator") {
        if (!parsed) {
          // No message yet - send request
          const request = formatPubKeyRequest({ requestId });
          return {
            outgoingMessage: request,
            remotePubKey: null,
            isComplete: false,
          };
        }

        if (parsed.type === DaiaMessageType.PubKeyResponse) {
          // Received response - send our public key
          const response = formatPubKeyResponse({
            publicKey: signingAdapter.getPublicKey(),
          });
          return {
            outgoingMessage: response,
            remotePubKey: parsed.response.publicKey,
            isComplete: true,
          };
        }
      }

      // Responder: Process request and send response
      if (role === "responder") {
        if (parsed?.type === DaiaMessageType.PubKeyRequest) {
          // Received request - send our public key
          const response = formatPubKeyResponse({
            publicKey: signingAdapter.getPublicKey(),
          });
          return {
            outgoingMessage: response,
            remotePubKey: null,
            isComplete: false,
          };
        }

        if (parsed?.type === DaiaMessageType.PubKeyResponse) {
          // Received their public key - exchange complete
          return {
            outgoingMessage: null,
            remotePubKey: parsed.response.publicKey,
            isComplete: true,
          };
        }
      }

      // No action needed
      return {
        outgoingMessage: null,
        remotePubKey: null,
        isComplete: false,
      };
    }
  );

  return RunnableSequence.from([parseStep, processStep]);
}
