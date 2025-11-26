/**
 * Offer Negotiation Chain
 * 
 * Handles the offer creation, validation, and negotiation flow using LangChain runnables.
 * Supports both offer creation (for sellers) and offer validation (for buyers).
 */

import {
  RunnableLambda,
  RunnableSequence,
  RunnableBranch,
} from "@langchain/core/runnables";
import type { DaiaOfferContent } from "@d4ia/proto";
import { serializeOfferContent } from "@d4ia/proto";
import {
  parseIncomingMessage,
  formatOfferMessage,
} from "../utils/messageParser";
import { DaiaMessageType } from "../types/schemas";
import type {
  IOfferCreationAdapter,
  IOfferValidationAdapter,
  ConversationContext,
  OfferCreationTrigger,
} from "../adapters/interfaces";

export interface OfferNegotiationInput {
  message: string | null;
  role: "offerer" | "recipient";
  context: ConversationContext<any>;
  maxOffers?: number;
}

export interface OfferNegotiationOutput {
  outgoingMessage: string | null;
  offer: DaiaOfferContent | null;
  offerCount: number;
  accepted: boolean;
  rejected: boolean;
  isDone: boolean;
  reasoning?: string;
  error?: string;
}

export interface OfferNegotiationChainConfig<T = any> {
  offerCreator?: IOfferCreationAdapter<T>;
  offerValidator?: IOfferValidationAdapter<T>;
  maxOffers?: number;
}

/**
 * Creates a chain for offer negotiation
 * 
 * For offerers: Creates and sends offers in response to requests
 * For recipients: Validates incoming offers and decides to accept/reject
 */
export function createOfferNegotiationChain<T = any>(
  config: OfferNegotiationChainConfig<T>
): RunnableSequence<OfferNegotiationInput, OfferNegotiationOutput> {
  const { offerCreator, offerValidator, maxOffers = 3 } = config;
  
  // Track offer count
  let offerCount = 0;

  // Step 1: Parse incoming message
  const parseStep = RunnableLambda.from(
    async (input: OfferNegotiationInput) => {
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

  // Step 2: Route based on role and message type
  const routeStep = RunnableBranch.from([
    [
      // Offerer receiving a natural language request -> create offer
      (input: any) =>
        input.role === "offerer" &&
        input.parsed?.type === DaiaMessageType.Natural,
      RunnableLambda.from(async (input: any): Promise<OfferNegotiationOutput> => {
        if (!offerCreator) {
          return {
            outgoingMessage: null,
            offer: null,
            offerCount: 0,
            accepted: false,
            rejected: false,
            isDone: false,
            error: "No offer creator configured",
          };
        }

        // Check max offers
        if (offerCount >= maxOffers) {
          return {
            outgoingMessage: `I've already sent ${maxOffers} offers. Cannot make another.`,
            offer: null,
            offerCount,
            accepted: false,
            rejected: true,
            isDone: true,
            reasoning: `Maximum offers (${maxOffers}) exceeded`,
          };
        }

        // Create offer
        try {
          const offer = await offerCreator.createOffer(
            {
              userRequest: input.message,
              conversationContext: {},
            },
            input.context
          );

          offerCount++;
          const serialized = serializeOfferContent(offer);
          const offerMessage = formatOfferMessage(serialized);

          return {
            outgoingMessage: offerMessage,
            offer,
            offerCount,
            accepted: false,
            rejected: false,
            isDone: false,
          };
        } catch (error) {
          return {
            outgoingMessage: null,
            offer: null,
            offerCount,
            accepted: false,
            rejected: false,
            isDone: false,
            error: `Failed to create offer: ${error}`,
          };
        }
      }),
    ],
    [
      // Recipient receiving an offer -> validate
      (input: any) =>
        input.role === "recipient" && input.parsed?.type === DaiaMessageType.Offer,
      RunnableLambda.from(async (input: any): Promise<OfferNegotiationOutput> => {
        if (!offerValidator) {
          return {
            outgoingMessage: null,
            offer: input.parsed.offer,
            offerCount: 0,
            accepted: false,
            rejected: false,
            isDone: false,
            error: "No offer validator configured",
          };
        }

        offerCount++;

        // Check max offers received
        if (offerCount > (input.maxOffers || maxOffers)) {
          return {
            outgoingMessage: `I've already received ${input.maxOffers || maxOffers} offers. Rejecting.`,
            offer: input.parsed.offer,
            offerCount,
            accepted: false,
            rejected: true,
            isDone: true,
            reasoning: `Maximum offers (${input.maxOffers || maxOffers}) exceeded`,
          };
        }

        // Validate offer
        try {
          const validation = await offerValidator.validateOffer(
            input.parsed.offer,
            input.context
          );

          return {
            outgoingMessage: null, // Caller decides what to send
            offer: input.parsed.offer,
            offerCount,
            accepted: validation.accepted,
            rejected: !validation.accepted,
            isDone: validation.accepted, // Done if accepted
            reasoning: validation.reasoning,
          };
        } catch (error) {
          return {
            outgoingMessage: null,
            offer: input.parsed.offer,
            offerCount,
            accepted: false,
            rejected: false,
            isDone: false,
            error: `Failed to validate offer: ${error}`,
          };
        }
      }),
    ],
    // Default: No action
    RunnableLambda.from((input: any): OfferNegotiationOutput => {
      return {
        outgoingMessage: null,
        offer: null,
        offerCount,
        accepted: false,
        rejected: false,
        isDone: false,
      };
    }),
  ]);

  return RunnableSequence.from([parseStep, routeStep]);
}
