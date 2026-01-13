import { describe, it } from "vitest";
import {
	DaiaAgreementResponseSchema,
	DaiaAgreementReferenceMessageSchema,
	DaiaAgreementReferenceResult,
} from "../agreementReference";
import { DaiaMessageType } from "../common";

describe("DaiaAgreementReferenceSchemas", () => {
	it("should validate agreement response with accept result", () => {
		DaiaAgreementResponseSchema.parse({
			result: DaiaAgreementReferenceResult.ACCEPT,
			agreementReference: "agreement-ref-123",
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "ACCEPTED",
						naturalLanguageOfferContent: "Accepted offer",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
		});
	});

	it("should validate agreement response with reject result", () => {
		DaiaAgreementResponseSchema.parse({
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: "Offer terms not acceptable",
		});
	});

	it("should validate agreement reference message with accept", () => {
		DaiaAgreementReferenceMessageSchema.parse({
			type: DaiaMessageType.OFFER_RESPONSE,
			result: DaiaAgreementReferenceResult.ACCEPT,
			agreementReference: "ref-456",
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "ACCEPTED-OFFER",
						naturalLanguageOfferContent: "Content",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {},
			},
		});
	});

	it("should validate agreement reference message with reject", () => {
		DaiaAgreementReferenceMessageSchema.parse({
			type: DaiaMessageType.OFFER_RESPONSE,
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: "Insufficient payment amount",
		});
	});

	it("should validate reject with detailed rationale", () => {
		DaiaAgreementResponseSchema.parse({
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: "The payment requirement of 1000 satoshis is below our minimum threshold of 5000",
		});
	});

	it("should validate accept with complex agreement", () => {
		DaiaAgreementResponseSchema.parse({
			result: DaiaAgreementReferenceResult.ACCEPT,
			agreementReference: "complex-ref-789",
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "COMPLEX",
						naturalLanguageOfferContent: "Complex agreement",
						requirements: {
							sign: {
								type: "sign",
								pubKey: "key",
								offererNonce: "nonce",
							},
							payment: {
								type: "payment",
								to: "addr",
								amount: 1000,
								auth: { type: "self" },
							},
						},
					}),
					signatures: {},
				},
				proofs: {
					sign: {
						type: "sign",
						signeeNonce: "s-nonce",
						signature: "sig",
					},
					payment: {
						type: "payment",
						txId: "tx-id",
					},
				},
			},
		});
	});

	it("should validate reject with empty rationale", () => {
		DaiaAgreementResponseSchema.parse({
			result: DaiaAgreementReferenceResult.REJECT,
			rationale: "",
		});
	});
});
