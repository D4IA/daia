/**
 * Unit tests for AgreementChain
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateKey } from "@bsv/sdk";
import { createAgreementChain } from "../chains/AgreementChain";
import { AgentSigningAdapter } from "../adapters/signingAdapter";
import { formatAgreementMessage } from "../utils/messageParser";
import { DaiaRequirementType } from "@d4ia/proto";
import type { DaiaOfferContent, DaiaAgreement } from "@d4ia/proto";

describe("AgreementChain", () => {
  let signingAdapter: AgentSigningAdapter;
  let chain: any;
  let testOffer: DaiaOfferContent;

  beforeEach(() => {
    const privateKey = PrivateKey.fromRandom();
    signingAdapter = new AgentSigningAdapter(privateKey.toWif());

    // Create test offer
    testOffer = {
      naturalLanguageOfferContent: "Test offer content",
      requirements: new Map([
        [
          "signature-1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: signingAdapter.getPublicKey(),
            offererNonce: "test-nonce-123",
          },
        ],
      ]),
    };

    chain = createAgreementChain({
      signingAdapter,
    });
  });

  describe("Signer role", () => {
    it("should sign an offer and create agreement", async () => {
      const result = await chain.invoke({
        offer: testOffer,
        role: "signer",
      });

      expect(result.outgoingMessage).toBeDefined();
      expect(result.outgoingMessage).toContain("DAIA_AGREEMENT:");
      expect(result.agreement).toBeDefined();
      expect(result.agreement?.proofs).toBeDefined();
      expect(result.agreement?.proofs.size).toBeGreaterThan(0);
      expect(result.isVerified).toBe(true);
      expect(result.isDone).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error when no offer provided", async () => {
      const result = await chain.invoke({
        offer: null,
        role: "signer",
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain("No offer provided");
      expect(result.agreement).toBeNull();
      expect(result.isVerified).toBe(false);
    });
  });

  describe("Verifier role", () => {
    it("should verify a valid signed agreement", async () => {
      // First sign an offer
      const signingResult = await signingAdapter.signOffer(testOffer);
      const agreementMessage = formatAgreementMessage(signingResult.agreement);

      // Create verifier chain with mock verifier that always passes
      const mockVerifier = {
        verify: vi.fn().mockResolvedValue(undefined),
      };

      const verifierChain = createAgreementChain({
        verifier: mockVerifier as any,
      });

      const result = await verifierChain.invoke({
        message: agreementMessage,
        role: "verifier",
      });

      expect(mockVerifier.verify).toHaveBeenCalled();
      expect(result.agreement).toBeDefined();
      expect(result.isVerified).toBe(true);
      expect(result.isDone).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error when verification fails", async () => {
      // Create invalid agreement message
      const invalidAgreement = formatAgreementMessage({
        offerContentSerialized: "{}",
        proofs: new Map(),
      } as DaiaAgreement);

      const mockVerifier = {
        verify: vi.fn().mockRejectedValue(new Error("Invalid signature")),
      };

      const verifierChain = createAgreementChain({
        verifier: mockVerifier as any,
      });

      const result = await verifierChain.invoke({
        message: invalidAgreement,
        role: "verifier",
      });

      expect(result.isVerified).toBe(false);
      expect(result.isDone).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("verification failed");
    });

    it("should return error when no agreement message provided", async () => {
      const mockVerifier = {
        verify: vi.fn(),
      };

      const verifierChain = createAgreementChain({
        verifier: mockVerifier as any,
      });

      const result = await verifierChain.invoke({
        message: "not an agreement message",
        role: "verifier",
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain("No agreement message");
      expect(mockVerifier.verify).not.toHaveBeenCalled();
    });
  });

  describe("Configuration", () => {
    it("should return error when signer has no signing adapter", async () => {
      const chainWithoutSigner = createAgreementChain({});

      const result = await chainWithoutSigner.invoke({
        offer: testOffer,
        role: "signer",
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain("No signing adapter");
    });

    it("should return error when verifier has no verifier configured", async () => {
      const chainWithoutVerifier = createAgreementChain({});
      const agreement = formatAgreementMessage({
        offerContentSerialized: "{}",
        proofs: new Map(),
      } as DaiaAgreement);

      const result = await chainWithoutVerifier.invoke({
        message: agreement,
        role: "verifier",
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain("No agreement verifier");
    });
  });
});
