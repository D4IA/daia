/**
 * Unit tests for OfferNegotiationChain
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOfferNegotiationChain } from "../chains/OfferNegotiationChain";
import { formatOfferMessage } from "../utils/messageParser";
import { serializeOfferContent, DaiaRequirementType } from "@d4ia/proto";
import type { DaiaOfferContent } from "@d4ia/proto";
import type {
  IOfferCreationAdapter,
  IOfferValidationAdapter,
} from "../adapters/interfaces";

describe("OfferNegotiationChain", () => {
  let testOffer: DaiaOfferContent;
  let mockOfferCreator: IOfferCreationAdapter<any>;
  let mockOfferValidator: IOfferValidationAdapter<any>;

  beforeEach(() => {
    testOffer = {
      naturalLanguageOfferContent: "Test parking rate: 1000 sat/hour",
      requirements: new Map([
        [
          "signature-1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: "test-pubkey",
            offererNonce: "test-nonce",
          },
        ],
      ]),
    };

    mockOfferCreator = {
      createOffer: vi.fn().mockResolvedValue(testOffer),
    };

    mockOfferValidator = {
      validateOffer: vi.fn().mockResolvedValue({
        accepted: true,
        reasoning: "Offer meets criteria",
        concerns: [],
      }),
    };
  });

  describe("Offerer role", () => {
    it("should create and send offer in response to natural language request", async () => {
      const chain = createOfferNegotiationChain({
        offerCreator: mockOfferCreator,
        maxOffers: 3,
      });

      const result = await chain.invoke({
        message: "I need parking. What's the rate?",
        role: "offerer",
        context: { messages: [] },
      });

      expect(mockOfferCreator.createOffer).toHaveBeenCalled();
      expect(result.outgoingMessage).toBeDefined();
      expect(result.outgoingMessage).toContain("DAIA_OFFER:");
      expect(result.offer).toEqual(testOffer);
      expect(result.offerCount).toBe(1);
      expect(result.isDone).toBe(false);
    });

    it("should reject when max offers reached", async () => {
      const chain = createOfferNegotiationChain({
        offerCreator: mockOfferCreator,
        maxOffers: 2,
      });

      // Send 2 offers
      await chain.invoke({
        message: "First request",
        role: "offerer",
        context: { messages: [] },
      });
      await chain.invoke({
        message: "Second request",
        role: "offerer",
        context: { messages: [] },
      });

      // Try third offer - should be rejected
      const result = await chain.invoke({
        message: "Third request",
        role: "offerer",
        context: { messages: [] },
      });

      expect(result.rejected).toBe(true);
      expect(result.isDone).toBe(true);
      expect(result.reasoning).toContain("Maximum offers");
      expect(result.outgoingMessage).toBeDefined();
    });

    it("should return error when no offer creator configured", async () => {
      const chain = createOfferNegotiationChain({
        maxOffers: 3,
      });

      const result = await chain.invoke({
        message: "Request without creator",
        role: "offerer",
        context: { messages: [] },
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain("No offer creator");
    });
  });

  describe("Recipient role", () => {
    it("should validate incoming offer and accept if valid", async () => {
      const chain = createOfferNegotiationChain({
        offerValidator: mockOfferValidator,
        maxOffers: 3,
      });

      const serializedOffer = serializeOfferContent(testOffer);
      const offerMessage = formatOfferMessage(serializedOffer);

      const result = await chain.invoke({
        message: offerMessage,
        role: "recipient",
        context: { messages: [] },
      });

      expect(mockOfferValidator.validateOffer).toHaveBeenCalledWith(
        testOffer,
        { messages: [] }
      );
      expect(result.offer).toEqual(testOffer);
      expect(result.accepted).toBe(true);
      expect(result.isDone).toBe(true);
      expect(result.reasoning).toBe("Offer meets criteria");
    });

    it("should reject offer when validation fails", async () => {
      const rejectingValidator = {
        validateOffer: vi.fn().mockResolvedValue({
          accepted: false,
          reasoning: "Rate too high",
          concerns: ["Exceeds budget"],
        }),
      };

      const chain = createOfferNegotiationChain({
        offerValidator: rejectingValidator,
        maxOffers: 3,
      });

      const serializedOffer = serializeOfferContent(testOffer);
      const offerMessage = formatOfferMessage(serializedOffer);

      const result = await chain.invoke({
        message: offerMessage,
        role: "recipient",
        context: { messages: [] },
      });

      expect(result.accepted).toBe(false);
      expect(result.rejected).toBe(true);
      expect(result.isDone).toBe(false); // Not done - can still receive more offers
      expect(result.reasoning).toBe("Rate too high");
    });

    it("should reject when max offers received", async () => {
      const chain = createOfferNegotiationChain({
        offerValidator: mockOfferValidator,
        maxOffers: 2,
      });

      const serializedOffer = serializeOfferContent(testOffer);
      const offerMessage = formatOfferMessage(serializedOffer);

      // Receive 2 offers
      await chain.invoke({
        message: offerMessage,
        role: "recipient",
        context: { messages: [] },
        maxOffers: 2,
      });
      await chain.invoke({
        message: offerMessage,
        role: "recipient",
        context: { messages: [] },
        maxOffers: 2,
      });

      // Try third offer - should be rejected
      const result = await chain.invoke({
        message: offerMessage,
        role: "recipient",
        context: { messages: [] },
        maxOffers: 2,
      });

      expect(result.rejected).toBe(true);
      expect(result.isDone).toBe(true);
      expect(result.reasoning).toContain("Maximum offers");
    });

    it("should return error when no validator configured", async () => {
      const chain = createOfferNegotiationChain({
        maxOffers: 3,
      });

      const serializedOffer = serializeOfferContent(testOffer);
      const offerMessage = formatOfferMessage(serializedOffer);

      const result = await chain.invoke({
        message: offerMessage,
        role: "recipient",
        context: { messages: [] },
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain("No offer validator");
    });
  });

  describe("Edge cases", () => {
    it("should handle null message gracefully", async () => {
      const chain = createOfferNegotiationChain({
        offerCreator: mockOfferCreator,
        maxOffers: 3,
      });

      const result = await chain.invoke({
        message: null,
        role: "offerer",
        context: { messages: [] },
      });

      expect(result).toBeDefined();
      expect(result.offerCount).toBe(0);
    });

    it("should handle non-offer messages for recipient", async () => {
      const chain = createOfferNegotiationChain({
        offerValidator: mockOfferValidator,
        maxOffers: 3,
      });

      const result = await chain.invoke({
        message: "Just a regular message",
        role: "recipient",
        context: { messages: [] },
      });

      expect(result.accepted).toBe(false);
      expect(result.rejected).toBe(false);
      expect(mockOfferValidator.validateOffer).not.toHaveBeenCalled();
    });
  });
});
