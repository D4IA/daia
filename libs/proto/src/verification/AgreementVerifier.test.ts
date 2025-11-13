import { describe, it, expect, beforeEach } from "vitest";
import { AgreementVerifier } from "./AgreementVerifier";
import {
  IBlockchainAdapter,
  ISignatureVerifier,
  PaymentVerification,
} from "./adapters";
import { PrivateKey, PublicKey, Signature } from "@bsv/sdk";
import { DaiaRequirementType } from "../types/offer";
import type { DaiaAgreement, DaiaOfferContent } from "../types/offer";
import { VerificationFailedError } from "./errors";
import { serializeOfferContent } from "./serialization";

// Mock adapters
class MockBlockchainAdapter implements IBlockchainAdapter {
  private payments = new Map<string, PaymentVerification>();

  addPayment(txId: string, verification: PaymentVerification) {
    this.payments.set(txId, verification);
  }

  async verifyPayment(txId: string): Promise<PaymentVerification> {
    return (
      this.payments.get(txId) || {
        exists: false,
        recipient: "",
        amount: 0,
        isConfirmed: false,
      }
    );
  }
}

class MockSignatureVerifier implements ISignatureVerifier {
  verify(message: string, signature: Signature, publicKey: PublicKey): boolean {
    const encoder = new TextEncoder();
    const messageBytes = Array.from(encoder.encode(message));
    return publicKey.verify(messageBytes, signature);
  }

  publicKeyFromString(pubKeyStr: string): PublicKey {
    return PublicKey.fromString(pubKeyStr);
  }

  signatureFromString(sigStr: string): Signature {
    return Signature.fromDER(sigStr, "hex");
  }
}

describe("AgreementVerifier", () => {
  let blockchainAdapter: MockBlockchainAdapter;
  let signatureVerifier: MockSignatureVerifier;
  let verifier: AgreementVerifier;

  beforeEach(() => {
    blockchainAdapter = new MockBlockchainAdapter();
    signatureVerifier = new MockSignatureVerifier();
    verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);
  });

  describe("signature verification", () => {
    it("should verify valid signature proof", async () => {
      const privateKey = PrivateKey.fromRandom();
      const publicKey = privateKey.toPublicKey();

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

      const offerContentSerialized = serializeOfferContent(offerContent);
      const signeeNonce = "nonce456";
      const message = `${offerContentSerialized}:nonce123:${signeeNonce}`;
      const encoder = new TextEncoder();
      const messageBytes = Array.from(encoder.encode(message));
      const signature = privateKey.sign(messageBytes);

      const agreement: DaiaAgreement = {
        offerContentSerialized,
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Sign,
              signeeNonce,
              signature: signature.toDER("hex") as string,
            },
          ],
        ]),
      };

      await expect(verifier.verify({ agreement })).resolves.toBeUndefined();
    });

    it("should reject invalid signature", async () => {
      const privateKey = PrivateKey.fromRandom();
      const wrongPrivateKey = PrivateKey.fromRandom();
      const publicKey = privateKey.toPublicKey();

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

      const offerContentSerialized = serializeOfferContent(offerContent);
      const signeeNonce = "nonce456";
      const message = `${offerContentSerialized}:nonce123:${signeeNonce}`;
      // Sign with wrong key
      const encoder = new TextEncoder();
      const messageBytes = Array.from(encoder.encode(message));
      const signature = wrongPrivateKey.sign(messageBytes);

      const agreement: DaiaAgreement = {
        offerContentSerialized,
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Sign,
              signeeNonce,
              signature: signature.toDER("hex") as string,
            },
          ],
        ]),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should reject when proof is missing", async () => {
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

      const agreement: DaiaAgreement = {
        offerContentSerialized: serializeOfferContent(offerContent),
        proofs: new Map(), // No proofs
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });
  });

  describe("payment verification", () => {
    it("should verify valid payment proof", async () => {
      const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      const txId = "tx123";

      blockchainAdapter.addPayment(txId, {
        exists: true,
        recipient,
        amount: 1000,
        isConfirmed: true,
      });

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

      const agreement: DaiaAgreement = {
        offerContentSerialized: serializeOfferContent(offerContent),
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: recipient,
              txId,
            },
          ],
        ]),
      };

      await expect(verifier.verify({ agreement })).resolves.toBeUndefined();
    });

    it("should reject when payment not found", async () => {
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

      const agreement: DaiaAgreement = {
        offerContentSerialized: serializeOfferContent(offerContent),
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: recipient,
              txId: "nonexistent",
            },
          ],
        ]),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should reject when payment recipient is wrong", async () => {
      const expectedRecipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      const actualRecipient = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
      const txId = "tx123";

      blockchainAdapter.addPayment(txId, {
        exists: true,
        recipient: actualRecipient,
        amount: 1000,
        isConfirmed: true,
      });

      const offerContent: DaiaOfferContent = {
        naturalLanguageOfferContent: "Test offer",
        requirements: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: expectedRecipient,
              txId: "",
            },
          ],
        ]),
      };

      const agreement: DaiaAgreement = {
        offerContentSerialized: serializeOfferContent(offerContent),
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: expectedRecipient,
              txId,
            },
          ],
        ]),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should use current transaction ID for self-paid proofs", async () => {
      const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
      const currentTxId = "current-tx-123";

      blockchainAdapter.addPayment(currentTxId, {
        exists: true,
        recipient,
        amount: 1000,
        isConfirmed: false, // Not yet confirmed since it's current tx
      });

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

      const agreement: DaiaAgreement = {
        offerContentSerialized: serializeOfferContent(offerContent),
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment,
              to: recipient,
              txId: "", // Empty txId means self-paid
            },
          ],
        ]),
      };

      await expect(
        verifier.verify({ agreement, txId: currentTxId })
      ).resolves.toBeUndefined();
    });
  });

  describe("type mismatch", () => {
    it("should reject when proof type does not match requirement type", async () => {
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

      const agreement: DaiaAgreement = {
        offerContentSerialized: serializeOfferContent(offerContent),
        proofs: new Map([
          [
            "req1",
            {
              type: DaiaRequirementType.Payment, // Wrong type
              to: "address",
              txId: "tx123",
            },
          ],
        ]),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });
  });

  describe("validation", () => {
    it("should reject invalid JSON", async () => {
      const agreement: DaiaAgreement = {
        offerContentSerialized: "{ invalid json",
        proofs: new Map(),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should reject missing requirements field", async () => {
      const agreement: DaiaAgreement = {
        offerContentSerialized: JSON.stringify({
          naturalLanguageOfferContent: "Test",
          // missing requirements
        }),
        proofs: new Map(),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should reject invalid requirement type", async () => {
      const agreement: DaiaAgreement = {
        offerContentSerialized: JSON.stringify({
          naturalLanguageOfferContent: "Test",
          requirements: {
            req1: {
              type: "invalid_type",
              data: "something",
            },
          },
        }),
        proofs: new Map(),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should reject signature requirement without pubKey", async () => {
      const agreement: DaiaAgreement = {
        offerContentSerialized: JSON.stringify({
          naturalLanguageOfferContent: "Test",
          requirements: {
            req1: {
              type: "sign",
              // missing pubKey
              offererNonce: "nonce",
            },
          },
        }),
        proofs: new Map(),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });

    it("should reject payment requirement without recipient", async () => {
      const agreement: DaiaAgreement = {
        offerContentSerialized: JSON.stringify({
          naturalLanguageOfferContent: "Test",
          requirements: {
            req1: {
              type: "payment",
              // missing to
              txId: "",
            },
          },
        }),
        proofs: new Map(),
      };

      await expect(verifier.verify({ agreement })).rejects.toThrow(
        VerificationFailedError
      );
    });
  });
});
