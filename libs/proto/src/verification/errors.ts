/**
 * Error types for agreement verification.
 * Uses discriminated unions for type-safe error handling.
 */

export type VerificationErrorType =
  | "REQUIREMENT_NOT_FOUND"
  | "PROOF_NOT_FOUND"
  | "INVALID_SIGNATURE"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_INSUFFICIENT"
  | "PAYMENT_WRONG_RECIPIENT"
  | "REQUIREMENT_TYPE_MISMATCH";

export type VerificationError =
  | {
      type: "REQUIREMENT_NOT_FOUND";
      requirementId: string;
      message: string;
    }
  | {
      type: "PROOF_NOT_FOUND";
      requirementId: string;
      message: string;
    }
  | {
      type: "INVALID_SIGNATURE";
      requirementId: string;
      pubKey: string;
      message: string;
    }
  | {
      type: "PAYMENT_NOT_FOUND";
      requirementId: string;
      txId: string;
      message: string;
    }
  | {
      type: "PAYMENT_INSUFFICIENT";
      requirementId: string;
      expected: number;
      actual: number;
      message: string;
    }
  | {
      type: "PAYMENT_WRONG_RECIPIENT";
      requirementId: string;
      expected: string;
      actual: string;
      message: string;
    }
  | {
      type: "REQUIREMENT_TYPE_MISMATCH";
      requirementId: string;
      expectedType: string;
      actualType: string;
      message: string;
    };

export class VerificationFailedError extends Error {
  constructor(
    public readonly errors: VerificationError[],
    message?: string
  ) {
    super(message || `Verification failed with ${errors.length} error(s)`);
    this.name = "VerificationFailedError";
  }
}
