import type {
  DaiaAgreement,
  DaiaOfferContent,
  DaiaOfferRequirement,
  DaiaOfferProof,
} from "../types/offer";
import { DaiaRequirementType } from "../types/offer";
import {
  IBlockchainAdapter,
  ISignatureVerifier,
} from "./adapters";
import { VerificationError, VerificationFailedError } from "./errors";
import { deserializeOfferContent } from "./serialization";
import { Transaction } from "@bsv/sdk";

/**
 * Data for verifying an agreement with payment proofs.
 * Either provide a transaction ID (for already broadcast transactions)
 * or a Transaction object (for mempool verification before broadcast).
 */
export type AgreementVerifyData = {
  agreement: DaiaAgreement;
} & (
  | { txId: string; tx?: never }
  | { tx: Transaction; txId?: never }
  | { txId?: never; tx?: never }
);

/**
 * Verifies that proofs in an agreement match the requirements.
 */
export class AgreementVerifier {
  constructor(
    private readonly blockchainAdapter: IBlockchainAdapter,
    private readonly signatureVerifier: ISignatureVerifier
  ) {}

  /**
   * Verify an agreement against its requirements.
   * @param verifyData - Object containing the agreement and optional transaction info
   * @throws VerificationFailedError if verification fails
   */
  async verify(verifyData: AgreementVerifyData): Promise<void> {
    const { agreement } = verifyData;
    const errors: VerificationError[] = [];

    // Extract transaction ID from either txId or Transaction object
    const currentTxId = verifyData.txId || (verifyData.tx ? verifyData.tx.id("hex") as string : undefined);

    // Parse and validate offer content using Zod
    let offerContent: DaiaOfferContent;
    try {
      offerContent = deserializeOfferContent(agreement.offerContentSerialized);
    } catch (error) {
      throw new VerificationFailedError([
        {
          type: "REQUIREMENT_TYPE_MISMATCH",
          requirementId: "N/A",
          expectedType: "valid",
          actualType: "invalid",
          message: `Failed to parse offer content: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ]);
    }

    // Verify each requirement has a corresponding proof
    for (const [requirementId, requirement] of offerContent.requirements) {
      const proof = agreement.proofs.get(requirementId);

      if (!proof) {
        errors.push({
          type: "PROOF_NOT_FOUND",
          requirementId,
          message: `No proof found for requirement ${requirementId}`,
        });
        continue;
      }

      // Verify type matches
      if (requirement.type !== proof.type) {
        errors.push({
          type: "REQUIREMENT_TYPE_MISMATCH",
          requirementId,
          expectedType: requirement.type,
          actualType: proof.type,
          message: `Requirement type ${requirement.type} does not match proof type ${proof.type}`,
        });
        continue;
      }

      // Verify based on type
      if (requirement.type === DaiaRequirementType.Sign) {
        await this.verifySignatureRequirement(
          requirementId,
          requirement,
          proof,
          agreement.offerContentSerialized,
          errors
        );
      } else if (requirement.type === DaiaRequirementType.Payment) {
        await this.verifyPaymentRequirement(
          requirementId,
          requirement,
          proof,
          currentTxId,
          errors
        );
      }
    }

    if (errors.length > 0) {
      throw new VerificationFailedError(errors);
    }
  }

  private async verifySignatureRequirement(
    requirementId: string,
    requirement: DaiaOfferRequirement,
    proof: DaiaOfferProof,
    offerContentSerialized: string,
    errors: VerificationError[]
  ): Promise<void> {
    if (requirement.type !== DaiaRequirementType.Sign || proof.type !== DaiaRequirementType.Sign) {
      return;
    }

    try {
      const message = this.buildSignatureMessage(
        offerContentSerialized,
        requirement.offererNonce,
        proof.signeeNonce
      );

      const publicKey = this.signatureVerifier.publicKeyFromString(
        requirement.pubKey
      );
      const signature = this.signatureVerifier.signatureFromString(
        proof.signature
      );

      const isValid = this.signatureVerifier.verify(
        message,
        signature,
        publicKey
      );

      if (!isValid) {
        errors.push({
          type: "INVALID_SIGNATURE",
          requirementId,
          pubKey: requirement.pubKey,
          message: `Signature verification failed for requirement ${requirementId}`,
        });
      }
    } catch (error) {
      errors.push({
        type: "INVALID_SIGNATURE",
        requirementId,
        pubKey: requirement.type === DaiaRequirementType.Sign ? requirement.pubKey : "unknown",
        message: `Error verifying signature: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  private async verifyPaymentRequirement(
    requirementId: string,
    requirement: DaiaOfferRequirement,
    proof: DaiaOfferProof,
    currentTxId: string | undefined,
    errors: VerificationError[]
  ): Promise<void> {
    if (requirement.type !== DaiaRequirementType.Payment || proof.type !== DaiaRequirementType.Payment) {
      return;
    }

    const txIdToVerify = this.resolveTransactionId(proof.txId, currentTxId);

    if (!txIdToVerify) {
      errors.push({
        type: "PAYMENT_NOT_FOUND",
        requirementId,
        txId: proof.txId,
        message: `No transaction ID provided for requirement ${requirementId}`,
      });
      return;
    }

    try {
      const paymentVerification =
        await this.blockchainAdapter.verifyPayment(txIdToVerify);

      if (!paymentVerification.exists) {
        errors.push({
          type: "PAYMENT_NOT_FOUND",
          requirementId,
          txId: txIdToVerify,
          message: `Payment transaction ${txIdToVerify} not found`,
        });
        return;
      }

      if (paymentVerification.recipient !== requirement.to) {
        errors.push({
          type: "PAYMENT_WRONG_RECIPIENT",
          requirementId,
          expected: requirement.to,
          actual: paymentVerification.recipient,
          message: `Payment recipient ${paymentVerification.recipient} does not match expected ${requirement.to}`,
        });
      }
    } catch (error) {
      errors.push({
        type: "PAYMENT_NOT_FOUND",
        requirementId,
        txId: txIdToVerify,
        message: `Error verifying payment: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Build the message to be signed/verified.
   * Format: offerContentSerialized:offererNonce:signeeNonce
   */
  private buildSignatureMessage(
    offerContentSerialized: string,
    offererNonce: string,
    signeeNonce: string
  ): string {
    return `${offerContentSerialized}:${offererNonce}:${signeeNonce}`;
  }

  /**
   * Resolve transaction ID for payment verification.
   * If proof txId is empty (self-paid), use currentTxId.
   */
  private resolveTransactionId(
    proofTxId: string,
    currentTxId: string | undefined
  ): string | undefined {
    return proofTxId === "" ? currentTxId : proofTxId;
  }
}
