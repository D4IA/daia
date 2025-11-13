/**
 * Unit tests for PubKeyExchangeChain
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateKey } from "@bsv/sdk";
import { createPubKeyExchangeChain } from "../chains/PubKeyExchangeChain";
import { AgentSigningAdapter } from "../adapters/signingAdapter";
import { formatPubKeyRequest, formatPubKeyResponse } from "../utils/messageParser";

describe("PubKeyExchangeChain", () => {
  let signingAdapter: AgentSigningAdapter;
  let chain: any;

  beforeEach(() => {
    // Create a test private key
    const privateKey = PrivateKey.fromRandom();
    signingAdapter = new AgentSigningAdapter(privateKey.toWif());
    
    chain = createPubKeyExchangeChain({
      signingAdapter,
      requestId: "test-agent",
    });
  });

  describe("Initiator role", () => {
    it("should send public key request when no message provided", async () => {
      const result = await chain.invoke({
        message: null,
        role: "initiator",
      });

      expect(result.outgoingMessage).toBeDefined();
      expect(result.outgoingMessage).toContain("DAIA_PUBKEY_REQUEST:");
      expect(result.remotePubKey).toBeNull();
      expect(result.isComplete).toBe(false);
    });

    it("should respond with own public key when receiving remote public key", async () => {
      const remotePubKey = PrivateKey.fromRandom().toPublicKey().toString();
      const pubKeyResponse = formatPubKeyResponse({ publicKey: remotePubKey });

      const result = await chain.invoke({
        message: pubKeyResponse,
        role: "initiator",
      });

      expect(result.outgoingMessage).toBeDefined();
      expect(result.outgoingMessage).toContain("DAIA_PUBKEY_RESPONSE:");
      expect(result.remotePubKey).toBe(remotePubKey);
      expect(result.isComplete).toBe(true);
    });
  });

  describe("Responder role", () => {
    it("should respond with public key when receiving request", async () => {
      const pubKeyRequest = formatPubKeyRequest({ requestId: "test" });

      const result = await chain.invoke({
        message: pubKeyRequest,
        role: "responder",
      });

      expect(result.outgoingMessage).toBeDefined();
      expect(result.outgoingMessage).toContain("DAIA_PUBKEY_RESPONSE:");
      expect(result.outgoingMessage).toContain(signingAdapter.getPublicKey());
      expect(result.isComplete).toBe(false);
    });

    it("should complete exchange when receiving remote public key", async () => {
      const remotePubKey = PrivateKey.fromRandom().toPublicKey().toString();
      const pubKeyResponse = formatPubKeyResponse({ publicKey: remotePubKey });

      const result = await chain.invoke({
        message: pubKeyResponse,
        role: "responder",
      });

      expect(result.outgoingMessage).toBeNull();
      expect(result.remotePubKey).toBe(remotePubKey);
      expect(result.isComplete).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle invalid messages gracefully", async () => {
      const result = await chain.invoke({
        message: "invalid message format",
        role: "initiator",
      });

      // Should not throw, but may return null or handle gracefully
      expect(result).toBeDefined();
    });
  });
});
