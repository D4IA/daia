import { DaiaTransactionData } from "../blockchain/data";
import { DaiaAgreement } from "../defines";

export enum AgreementVerifyQueryType {
	PARSED_TRANSACTION = "parsed-transaction",
	RAW_TRANSACTION = "raw-transaction",
	TRANSACTION_ID = "transaction-id",
	URL = "url",
}

export type AgreementVerifyQuery =
	| {
			type: AgreementVerifyQueryType.PARSED_TRANSACTION;
			transaction: DaiaTransactionData;
	  }
	| {
			type: AgreementVerifyQueryType.RAW_TRANSACTION;
			transaction: string;
	  }
	| {
			type: AgreementVerifyQueryType.TRANSACTION_ID;
			id: string;
	  }
	| {
			type: AgreementVerifyQueryType.URL;
			url: string;
	  };

export enum AgreementVerifyErrorType {
	FETCH_FAILED = "fetch-failed",
	PARSE_FAILED = "parse-failed",
	SCHEMA_INVALID = "schema-invalid",
	MISSING_PROOF = "missing-proof",
	INVALID_PROOF = "invalid-proof",
	REQUIREMENT_UNSATISFIED = "requirement-unsatisfied",
	OTHER = "other",
}

export type AgreementVerifyError =
	| {
			type:
				| AgreementVerifyErrorType.FETCH_FAILED
				| AgreementVerifyErrorType.PARSE_FAILED
				| AgreementVerifyErrorType.SCHEMA_INVALID
				| AgreementVerifyErrorType.OTHER;
			message: string;
	  }
	| {
			type:
				| AgreementVerifyErrorType.MISSING_PROOF
				| AgreementVerifyErrorType.INVALID_PROOF
				| AgreementVerifyErrorType.REQUIREMENT_UNSATISFIED;
			requirementId: string;
			message: string;
	  };

export type SignatureVerifyParams = {
	pubKey: string;
	message: string;
	signature: string;
};

export interface SignatureValidator {
	verifySignature: (params: SignatureVerifyParams) => Promise<boolean>;
}

export interface AgreementVerifyResult {
	agreement: DaiaAgreement;
	errors: AgreementVerifyError[];
	requirementsSatisfied: Set<string>;
	requirementsNotSatisfied: Set<string>;
}

export interface AgreementVerifier {
	verifyAgreement: (query: AgreementVerifyQuery) => Promise<AgreementVerifyResult>;
}
