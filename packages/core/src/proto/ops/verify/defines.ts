import { DaiaAgreement } from "../../defines";

export enum DaiaAgreementVerificationResult {
	PASSED = "passed",
	FAILED = "failed",
}

export enum DaiaAgreementVerificationFailureType {
	OTHER = "other",
	REQUIREMENTS_TO_PROOFS_MISMATCH = "requirements-proofs-mismatch",
}

export type DaiaAgreementVerificationFailure =
	| {
			type: DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH;
	  }
	| {
			type: DaiaAgreementVerificationFailureType.OTHER;
	  };

export type DaiaAgreementVerifyResponse =
	| {
			result: DaiaAgreementVerificationResult.PASSED;
			totalAgreementPayments: {
				[to: string]: number;
			} | null;
	  }
	| {
			result: DaiaAgreementVerificationResult.FAILED;
			failure: DaiaAgreementVerificationFailure;
	  };

export type DaiaAgreementVerifyRequest = {
	agreement: DaiaAgreement;

	/**
	 * Data of transaction this agreement was found in.
	 */
	transactionData?: {
		payments: {
			[to: string]: number;
		};
	};
};

export type DaiaAgreementFromTransactionResponse =
	| {
			found: true;
			agreement: DaiaAgreement;
			verification: DaiaAgreementVerifyResponse;
	  }
	| {
			found: false;
	  };

export interface DaiaAgreementVerifier {
	verifyAgreement: (request: DaiaAgreementVerifyRequest) => Promise<DaiaAgreementVerifyResponse>;
	
	/**
	 * Downloads blockchain transaction by ID and extracts agreement if present.
	 * Returns the agreement along with its verification result.
	 */
	getAgreementFromTransaction: (transactionId: string) => Promise<DaiaAgreementFromTransactionResponse>;
}
