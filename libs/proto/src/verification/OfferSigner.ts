import { PrivateKey } from "@bsv/sdk";
import type {
  DaiaOfferContent,
  DaiaAgreement,
  DaiaOfferProof,
} from "../types/offer";
import { DaiaRequirementType } from "../types/offer";
import {
  ISignatureSigner,
  ISigningResourcesAdapter,
} from "./adapters";
import { serializeOfferContent } from "./serialization";

/**
 * Payment map - address to amount in satoshis
 */
export type PaymentMap = Map<string, number>;

/**
 * Result of signing an offer
 */
export interface SigningResult {
  /**
   * The agreement with all proofs filled in
   */
  agreement: DaiaAgreement;

  /**
   * Map of addresses to amounts that need to be paid
   * This will be used to construct the blockchain transaction
   */
  paymentsRequired: PaymentMap;
}

/**
 * Creates proofs for offer requirements.
 * For now, only supports payments in the current transaction (self-paid).
 */
export class OfferSigner {
  constructor(
    private readonly signatureSigner: ISignatureSigner,
    private readonly signingResourcesAdapter: ISigningResourcesAdapter
  ) {}

  /**
   * Sign an offer and create proofs for all requirements.
   * @param offerContent - The offer content with requirements
   * @returns Signing result with agreement and payment map
   * @throws Error if unable to sign (missing private key, etc.)
   */
  async sign(offerContent: DaiaOfferContent): Promise<SigningResult> {
    const proofs = new Map<string, DaiaOfferProof>();
    const paymentsRequired: PaymentMap = new Map();

    // Serialize offer content for signature verification
    const offerContentSerialized = serializeOfferContent(offerContent);

    for (const [requirementId, requirement] of offerContent.requirements) {
      if (requirement.type === DaiaRequirementType.Sign) {
        const proof = await this.createSignatureProof(
          requirement,
          offerContentSerialized
        );
        proofs.set(requirementId, proof);
      } else if (requirement.type === DaiaRequirementType.Payment) {
        const proof = await this.createPaymentProof(
          requirement,
          paymentsRequired
        );
        proofs.set(requirementId, proof);
      }
    }

    const agreement: DaiaAgreement = {
      offerContentSerialized,
      proofs,
    };

    return {
      agreement,
      paymentsRequired,
    };
  }

  private async createSignatureProof(
    requirement: Extract<DaiaOfferContent["requirements"] extends Map<string, infer R> ? R : never, { type: "sign" }>,
    offerContentSerialized: string
  ): Promise<DaiaOfferProof> {
    const privateKey = await this.signingResourcesAdapter.getPrivateKey(
      requirement.pubKey
    );

    if (!privateKey) {
      throw new Error(
        `No private key available for public key ${requirement.pubKey}`
      );
    }

    const signeeNonce = this.generateNonce();
    const message = this.buildSignatureMessage(
      offerContentSerialized,
      requirement.offererNonce,
      signeeNonce
    );

    const publicKey = this.signatureSigner.publicKeyFromString(requirement.pubKey);
    const signature = await this.signatureSigner.sign(message, publicKey);

    if (!signature) {
      throw new Error(
        `Failed to sign message with public key ${requirement.pubKey}`
      );
    }

    return {
      type: DaiaRequirementType.Sign,
      signeeNonce,
      signature: signature.toDER("hex") as string,
    };
  }

  private async createPaymentProof(
    requirement: Extract<DaiaOfferContent["requirements"] extends Map<string, infer R> ? R : never, { type: "payment" }>,
    paymentsRequired: PaymentMap
  ): Promise<DaiaOfferProof> {
    const address = requirement.to;

    // Add to payments required map
    const currentAmount = paymentsRequired.get(address) || 0;
    paymentsRequired.set(address, currentAmount);

    return {
      type: DaiaRequirementType.Payment,
      to: address,
      txId: "", // Empty txId means self-paid
    };
  }

  /**
   * Build the message to be signed.
   * Format: offerContentSerialized:offererNonce:signeeNonce
   */
  private buildSignatureMessage(
    offerContentSerialized: string,
    offererNonce: string,
    signeeNonce: string
  ): string {
    return `${offerContentSerialized}:${offererNonce}:${signeeNonce}`;
  }

  private generateNonce(): string {
    // Generate a random nonce
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
