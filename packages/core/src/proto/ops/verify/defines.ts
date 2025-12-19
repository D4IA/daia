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

export interface DaiaAgreementVerifier {
	verifyAgreement: (request: DaiaAgreementVerifyRequest) => Promise<DaiaAgreementVerifyResponse>;
}
