import { describe, it, expect, beforeEach } from "vitest";
import { OfferSigner } from "./OfferSigner";
import {
  ISignatureSigner,
  ISigningResourcesAdapter,
} from "./adapters";
import { PrivateKey, PublicKey, Signature } from "@bsv/sdk";
import { DaiaRequirementType } from "../types/offer";
import type { DaiaOfferContent } from "../types/offer";
import { serializeOfferContent } from "./serialization";

// Mock adapters
class MockSignatureSigner implements ISignatureSigner {
  private keys = new Map<string, PrivateKey>();

  addKey(pubKey: string, privateKey: PrivateKey) {
    this.keys.set(pubKey, privateKey);
  }

  async sign(message: string, publicKey: PublicKey): Promise<Signature | null> {
    const privateKey = this.keys.get(publicKey.toString());
    if (!privateKey) return null;
    
    const encoder = new TextEncoder();
    const messageBytes = Array.from(encoder.encode(message));
    return privateKey.sign(messageBytes);
  }

  hasPrivateKey(publicKey: PublicKey): boolean {
    return this.keys.has(publicKey.toString());
  }

  publicKeyFromString(pubKeyStr: string): PublicKey {
    return PublicKey.fromString(pubKeyStr);
  }
}

class MockSigningResourcesAdapter implements ISigningResourcesAdapter {
  private keys = new Map<string, PrivateKey>();

  addKey(pubKey: string, privateKey: PrivateKey) {
    this.keys.set(pubKey, privateKey);
  }

  async getPrivateKey(pubKey: string): Promise<PrivateKey | null> {
    return this.keys.get(pubKey) || null;
  }

  async getCurrentTransactionId(): Promise<string | null> {
    return null; // Not used in current implementation
  }
}

describe("OfferSigner", () => {
  let signatureSigner: MockSignatureSigner;
  let signingResourcesAdapter: MockSigningResourcesAdapter;
  let signer: OfferSigner;

  beforeEach(() => {
    signatureSigner = new MockSignatureSigner();
    signingResourcesAdapter = new MockSigningResourcesAdapter();
    signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
  });

  describe("signature requirements", () => {
    it("should create valid signature proof", async () => {
      const privateKey = PrivateKey.fromRandom();
      const publicKey = privateKey.toPublicKey();

      signatureSigner.addKey(publicKey.toString(), privateKey);
      signingResourcesAdapter.addKey(publicKey.toString(), privateKey);

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: publicKey.toString(),
              offererNonce: "nonce123",
            },
          ],
        ]),
      };

      const result = await signer.sign(offerContent);

      expect(result.agreement.proofs.size).toBe(1);
      const proof = result.agreement.proofs.get("req1");
      expect(proof).toBeDefined();
      expect(proof?.type).toBe(DaiaRequirementType.Sign);

      if (proof?.type === DaiaRequirementType.Sign) {
        expect(proof.signeeNonce).toBeDefined();
        expect(proof.signature).toBeDefined();

        // Verify the signature is valid
        const message = `${result.agreement.offerContentSerialized}:nonce123:${proof.signeeNonce}`;
        const sig = Signature.fromDER(proof.signature, "hex");
        expect(publicKey.verify(message, sig)).toBe(true);
      }
    });

    it("should throw error when private key is not available", async () => {
      const publicKey = PrivateKey.fromRandom().toPublicKey();

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: publicKey.toString(),
              offererNonce: "nonce123",
            },
          ],
        ]),
      };

      await expect(signer.sign(offerContent)).rejects.toThrow(
        "No private key available"
      );
    });

    it("should create unique nonces for each signing", async () => {
      const privateKey = PrivateKey.fromRandom();
      const publicKey = privateKey.toPublicKey();

      signatureSigner.addKey(publicKey.toString(), privateKey);
      signingResourcesAdapter.addKey(publicKey.toString(), privateKey);

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: publicKey.toString(),
              offererNonce: "nonce123",
            },
          ],
        ]),
      };

      const result1 = await signer.sign(offerContent);
      const result2 = await signer.sign(offerContent);

      const proof1 = result1.agreement.proofs.get("req1");
      const proof2 = result2.agreement.proofs.get("req1");

      if (
        proof1?.type === DaiaRequirementType.Sign &&
        proof2?.type === DaiaRequirementType.Sign
      ) {
        expect(proof1.signeeNonce).not.toBe(proof2.signeeNonce);
      }
    });
  });

  describe("payment requirements", () => {
    it("should create payment proof with empty txId for self-paid", async () => {
      const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: recipient,
              txId: "",
            },
          ],
        ]),
      };

      const result = await signer.sign(offerContent);

      expect(result.agreement.proofs.size).toBe(1);
      const proof = result.agreement.proofs.get("req1");
      expect(proof).toBeDefined();
      expect(proof?.type).toBe(DaiaRequirementType.Payment);

      if (proof?.type === DaiaRequirementType.Payment) {
        expect(proof.txId).toBe("");
        expect(proof.to).toBe(recipient);
      }
    });

    it("should populate payments required map", async () => {
      const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: recipient,
              txId: "",
            },
          ],
        ]),
      };

      const result = await signer.sign(offerContent);

      expect(result.paymentsRequired.size).toBe(1);
      expect(result.paymentsRequired.has(recipient)).toBe(true);
    });
  });

  describe("mixed requirements", () => {
    it("should handle both signature and payment requirements", async () => {
      const privateKey = PrivateKey.fromRandom();
      const publicKey = privateKey.toPublicKey();
      const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

      signatureSigner.addKey(publicKey.toString(), privateKey);
      signingResourcesAdapter.addKey(publicKey.toString(), privateKey);

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Sign,
              pubKey: publicKey.toString(),
              offererNonce: "nonce123",
            },
          ],
          [
            "req2",
            {
              type: DaiaRequirementType.Payment,
              to: recipient,
              txId: "",
            },
          ],
        ]),
      };

      const result = await signer.sign(offerContent);

      expect(result.agreement.proofs.size).toBe(2);
      expect(result.agreement.proofs.has("req1")).toBe(true);
      expect(result.agreement.proofs.has("req2")).toBe(true);
      expect(result.paymentsRequired.size).toBe(1);
      expect(result.paymentsRequired.has(recipient)).toBe(true);
    });
  });
});
