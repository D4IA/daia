/**
 * Agreement Verification Chain
 * 
 * Handles signing and verifying DAIA agreements using LangChain runnables.
 */

import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import type { DaiaOfferContent, DaiaAgreement } from "@d4ia/proto";
import { AgentSigningAdapter } from "../adapters/signingAdapter";
import { AgreementVerifier } from "@d4ia/proto";
import {
  parseIncomingMessage,
  formatAgreementMessage,
} from "../utils/messageParser";
import { DaiaMessageType } from "../types/schemas";

export interface AgreementInput {
  message?: string | null;
  offer?: DaiaOfferContent | null;
  role: "signer" | "verifier";
}

export interface AgreementOutput {
  outgoingMessage: string | null;
  agreement: DaiaAgreement | null;
  isVerified: boolean;
  isDone: boolean;
  error?: string;
}

export interface AgreementChainConfig {
  signingAdapter?: AgentSigningAdapter;
  verifier?: AgreementVerifier;
}

/**
 * Creates a chain for signing or verifying agreements
 */
export function createAgreementChain(
  config: AgreementChainConfig
): RunnableSequence<AgreementInput, AgreementOutput> {
  const { signingAdapter, verifier } = config;

  // Step 1: Parse input
  const parseStep = RunnableLambda.from(async (input: AgreementInput) => {
    if (input.message) {
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
    return { ...input, parsed: null };
  });

  // Step 2: Process based on role
  const processStep = RunnableLambda.from(
    async (input: any): Promise<AgreementOutput> => {
      const { role, parsed, offer, error } = input;

      if (error) {
        return {
          outgoingMessage: null,
          agreement: null,
          isVerified: false,
          isDone: false,
          error,
        };
      }

      // Signer: Sign an offer and create agreement
      if (role === "signer") {
        if (!signingAdapter) {
          return {
            outgoingMessage: null,
            agreement: null,
            isVerified: false,
            isDone: false,
            error: "No signing adapter configured",
          };
        }

        if (!offer) {
          return {
            outgoingMessage: null,
            agreement: null,
            isVerified: false,
            isDone: false,
            error: "No offer provided for signing",
          };
        }

        try {
          const signingResult = await signingAdapter.signOffer(offer);
          const agreementMessage = formatAgreementMessage(
            signingResult.agreement
          );

          return {
            outgoingMessage: agreementMessage,
            agreement: signingResult.agreement,
            isVerified: true, // Self-signed is considered verified
            isDone: true,
          };
        } catch (error) {
          return {
            outgoingMessage: null,
            agreement: null,
            isVerified: false,
            isDone: false,
            error: `Failed to sign offer: ${error}`,
          };
        }
      }

      // Verifier: Verify an incoming agreement
      if (role === "verifier") {
        if (!verifier) {
          return {
            outgoingMessage: null,
            agreement: null,
            isVerified: false,
            isDone: false,
            error: "No agreement verifier configured",
          };
        }

        if (parsed?.type !== DaiaMessageType.Agreement) {
          return {
            outgoingMessage: null,
            agreement: null,
            isVerified: false,
            isDone: false,
            error: "No agreement message to verify",
          };
        }

        try {
          await verifier.verify({
            agreement: parsed.agreement,
          });

          return {
            outgoingMessage: null,
            agreement: parsed.agreement,
            isVerified: true,
            isDone: true,
          };
        } catch (error) {
          return {
            outgoingMessage: null,
            agreement: parsed.agreement,
            isVerified: false,
            isDone: true, // Done but failed
            error: `Agreement verification failed: ${error}`,
          };
        }
      }

      return {
        outgoingMessage: null,
        agreement: null,
        isVerified: false,
        isDone: false,
      };
    }
  );

  return RunnableSequence.from([parseStep, processStep]);
}
