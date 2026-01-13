import { describe, it, expect } from "vitest";
import {
	DaiaAgreementVerificationResult,
	DaiaAgreementVerificationFailureType,
	DaiaAgreementVerifyRequest,
} from "../defines";
import { DaiaRequirementType } from "../../../defines";

describe("DaiaAgreementVerificationTypes", () => {
	it("should create verification result passed", () => {
		const result = DaiaAgreementVerificationResult.PASSED;
		expect(result).toBeDefined();
	});

	it("should create verification result failed", () => {
		const result = DaiaAgreementVerificationResult.FAILED;
		expect(result).toBeDefined();
	});

	it("should create failure type requirements to proofs mismatch", () => {
		const failureType = DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH;
		expect(failureType).toBeDefined();
	});

	it("should create failure type other", () => {
		const failureType = DaiaAgreementVerificationFailureType.OTHER;
		expect(failureType).toBeDefined();
	});

	it("should create verify request with empty agreement", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "TEST",
						naturalLanguageOfferContent: "Test",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
		};
		expect(request.agreement).toBeDefined();
	});

	it("should create verify request with transaction data", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "PAYMENT",
						naturalLanguageOfferContent: "With payment",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
			transactionData: {
				payments: {
					"address-1": 1000,
					"address-2": 500,
				},
			},
		};
		expect(request.transactionData).toBeDefined();
	});

	it("should create verify request with sign proofs", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "SIGNED",
						naturalLanguageOfferContent: "Signed agreement",
						requirements: {
							"sign-1": {
								type: DaiaRequirementType.SIGN,
								pubKey: "key-1",
								offererNonce: "nonce-1",
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"sign-1": {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "signee-nonce",
						signature: "signature-data",
					},
				},
			},
		};
		expect(request.agreement).toBeDefined();
	});

	it("should create verify request with payment proofs", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "PAID",
						naturalLanguageOfferContent: "Paid agreement",
						requirements: {
							"payment-1": {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 1000,
								auth: { type: "self" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						txId: "payment-tx-id",
					},
				},
			},
			transactionData: {
				payments: {
					addr: 1000,
				},
			},
		};
		expect(request.agreement).toBeDefined();
	});

	it("should create verify request with multiple proofs", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "COMPLEX",
						naturalLanguageOfferContent: "Complex",
						requirements: {
							sign: {
								type: DaiaRequirementType.SIGN,
								pubKey: "key",
								offererNonce: "nonce",
							},
							payment: {
								type: DaiaRequirementType.PAYMENT,
								to: "addr",
								amount: 500,
								auth: { type: "self" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					sign: {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "s-nonce",
						signature: "sig",
					},
					payment: {
						type: DaiaRequirementType.PAYMENT,
						txId: "tx",
					},
				},
			},
			transactionData: {
				payments: {
					addr: 500,
				},
			},
		};
		expect(request.agreement).toBeDefined();
	});

	it("should create verify request with agreement reference proof", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "REF",
						naturalLanguageOfferContent: "Referenced",
						requirements: {
							ref: {
								type: DaiaRequirementType.AGREEMENT_REFERENCE,
								referenceType: "parent",
								pointer: {
									type: "tx-id",
									txId: "parent-tx",
								},
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					ref: {
						type: DaiaRequirementType.AGREEMENT_REFERENCE,
						reference: "resolved-ref",
					},
				},
			},
		};
		expect(request.agreement).toBeDefined();
	});

	it("should create verify request without transaction data", () => {
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "NO-TX-DATA",
						naturalLanguageOfferContent: "No transaction data",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
		};
		expect(request.agreement).toBeDefined();
	});
});
