import { describe, it, expect } from "vitest";
import { AgreementVerifier } from "./AgreementVerifier";
import { OfferSigner } from "./OfferSigner";
import {
  IBlockchainAdapter,
  ISignatureVerifier,
  ISignatureSigner,
  ISigningResourcesAdapter,
  PaymentVerification,
} from "./adapters";
import { PrivateKey, PublicKey, Signature } from "@bsv/sdk";
import { DaiaRequirementType } from "../types/offer";
import type { DaiaOfferContent } from "../types/offer";

/**
 * Integration tests: create offer -> sign -> verify flow
 */

// Mock implementations
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
    return null;
  }
}

describe("Integration: Offer Creation -> Signing -> Verification", () => {
  it("should successfully sign and verify a signature-only offer", async () => {
    // Setup
    const privateKey = PrivateKey.fromRandom();
    const publicKey = privateKey.toPublicKey();

    const signatureSigner = new MockSignatureSigner();
    signatureSigner.addKey(publicKey.toString(), privateKey);
    
    const signatureVerifier = new MockSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter();
    signingResourcesAdapter.addKey(publicKey.toString(), privateKey);

    const blockchainAdapter = new MockBlockchainAdapter();

    const signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
    const verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);

    // 1. Create offer
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Please sign this agreement",
      requirements: new Map([
        [
          "signature1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: publicKey.toString(),
            offererNonce: "offerer-nonce-123",
          },
        ],
      ]),
    };

    // 2. Sign offer
    const { agreement } = await signer.sign(offerContent);

    // 3. Verify agreement
    await expect(verifier.verify({ agreement })).resolves.toBeUndefined();
  });

  it("should successfully sign and verify a payment-only offer", async () => {
    // Setup
    const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    const currentTxId = "tx-current-123";

    const signatureSigner = new MockSignatureSigner();
    const signatureVerifier = new MockSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter();
    const blockchainAdapter = new MockBlockchainAdapter();

    // Mock the payment transaction
    blockchainAdapter.addPayment(currentTxId, {
      exists: true,
      recipient,
      amount: 1000,
      isConfirmed: false,
    });

    const signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
    const verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);

    // 1. Create offer
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Pay parking fee",
      requirements: new Map([
        [
          "payment1",
          {
            type: DaiaRequirementType.Payment,
            to: recipient,
            txId: "",
          },
        ],
      ]),
    };

    // 2. Sign offer
    const { agreement, paymentsRequired } = await signer.sign(offerContent);

    // Verify payments map is populated
    expect(paymentsRequired.has(recipient)).toBe(true);

    // 3. Verify agreement with current transaction ID
    await expect(
      verifier.verify({ agreement, txId: currentTxId })
    ).resolves.toBeUndefined();
  });

  it("should successfully sign and verify mixed offer (signature + payment)", async () => {
    // Setup
    const privateKey = PrivateKey.fromRandom();
    const publicKey = privateKey.toPublicKey();
    const recipient = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
    const currentTxId = "tx-current-456";

    const signatureSigner = new MockSignatureSigner();
    signatureSigner.addKey(publicKey.toString(), privateKey);
    
    const signatureVerifier = new MockSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter();
    signingResourcesAdapter.addKey(publicKey.toString(), privateKey);

    const blockchainAdapter = new MockBlockchainAdapter();
    blockchainAdapter.addPayment(currentTxId, {
      exists: true,
      recipient,
      amount: 2000,
      isConfirmed: false,
    });

    const signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
    const verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);

    // 1. Create offer with multiple requirements
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Sign agreement and pay parking fee",
      requirements: new Map([
        [
          "signature1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: publicKey.toString(),
            offererNonce: "nonce-abc",
          },
        ],
        [
          "payment1",
          {
            type: DaiaRequirementType.Payment,
            to: recipient,
            txId: "",
          },
        ],
      ]),
    };

    // 2. Sign offer
    const { agreement, paymentsRequired } = await signer.sign(offerContent);

    // Verify both proofs were created
    expect(agreement.proofs.size).toBe(2);
    expect(agreement.proofs.has("signature1")).toBe(true);
    expect(agreement.proofs.has("payment1")).toBe(true);
    expect(paymentsRequired.has(recipient)).toBe(true);

    // 3. Verify agreement
    await expect(
      verifier.verify({ agreement, txId: currentTxId })
    ).resolves.toBeUndefined();
  });

  it("should fail verification if signature is tampered", async () => {
    // Setup
    const privateKey = PrivateKey.fromRandom();
    const publicKey = privateKey.toPublicKey();

    const signatureSigner = new MockSignatureSigner();
    signatureSigner.addKey(publicKey.toString(), privateKey);
    
    const signatureVerifier = new MockSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter();
    signingResourcesAdapter.addKey(publicKey.toString(), privateKey);

    const blockchainAdapter = new MockBlockchainAdapter();

    const signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
    const verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);

    // 1. Create and sign offer
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Sign this",
      requirements: new Map([
        [
          "sig1",
          {
            type: DaiaRequirementType.Sign,
            pubKey: publicKey.toString(),
            offererNonce: "nonce-xyz",
          },
        ],
      ]),
    };

    const { agreement } = await signer.sign(offerContent);

    // 2. Tamper with the signature proof
    const proof = agreement.proofs.get("sig1");
    if (proof && proof.type === DaiaRequirementType.Sign) {
      const tamperedProof = {
        ...proof,
        signature: proof.signature.replace(/a/g, "b"), // Corrupt signature
      };
      agreement.proofs.set("sig1", tamperedProof);
    }

    // 3. Verification should fail
    await expect(verifier.verify({ agreement })).rejects.toThrow();
  });

  it("should fail verification if payment is not found", async () => {
    // Setup
    const recipient = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";

    const signatureSigner = new MockSignatureSigner();
    const signatureVerifier = new MockSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter();
    const blockchainAdapter = new MockBlockchainAdapter();
    // Note: No payment added to blockchain adapter

    const signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
    const verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);

    // 1. Create and sign offer
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Pay now",
      requirements: new Map([
        [
          "pay1",
          {
            type: DaiaRequirementType.Payment,
            to: recipient,
            txId: "",
          },
        ],
      ]),
    };

    const { agreement } = await signer.sign(offerContent);

    // 2. Verification should fail (no currentTxId provided and payment not found)
    await expect(verifier.verify({ agreement })).rejects.toThrow();
  });

  it("should handle multiple signers with different keys", async () => {
    // Setup: Alice and Bob both need to sign
    const aliceKey = PrivateKey.fromRandom();
    const alicePubKey = aliceKey.toPublicKey();
    const bobKey = PrivateKey.fromRandom();
    const bobPubKey = bobKey.toPublicKey();

    const signatureSigner = new MockSignatureSigner();
    signatureSigner.addKey(alicePubKey.toString(), aliceKey);
    signatureSigner.addKey(bobPubKey.toString(), bobKey);
    
    const signatureVerifier = new MockSignatureVerifier();
    const signingResourcesAdapter = new MockSigningResourcesAdapter();
    signingResourcesAdapter.addKey(alicePubKey.toString(), aliceKey);
    signingResourcesAdapter.addKey(bobPubKey.toString(), bobKey);

    const blockchainAdapter = new MockBlockchainAdapter();

    const signer = new OfferSigner(signatureSigner, signingResourcesAdapter);
    const verifier = new AgreementVerifier(blockchainAdapter, signatureVerifier);

    // 1. Create offer requiring both signatures
    const offerContent: DaiaOfferContent = {
      naturalLanguageOfferContent: "Both Alice and Bob must sign",
      requirements: new Map([
        [
          "alice-sig",
          {
            type: DaiaRequirementType.Sign,
            pubKey: alicePubKey.toString(),
            offererNonce: "alice-nonce",
          },
        ],
        [
          "bob-sig",
          {
            type: DaiaRequirementType.Sign,
            pubKey: bobPubKey.toString(),
            offererNonce: "bob-nonce",
          },
        ],
      ]),
    };

    // 2. Sign offer (both signatures created)
    const { agreement } = await signer.sign(offerContent);

    expect(agreement.proofs.size).toBe(2);

    // 3. Verify agreement
    await expect(verifier.verify({ agreement })).resolves.toBeUndefined();
  });
});
