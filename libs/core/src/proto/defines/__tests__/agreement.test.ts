import { describe, it } from "vitest";
import { DaiaAgreementSchema } from "../agreement";
import { DaiaRequirementType } from "../requirement";

describe("DaiaAgreementSchema", () => {
	it("should validate agreement with empty proofs", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "TEST",
					naturalLanguageOfferContent: "Test content",
					requirements: {},
				}),
				signatures: {},
			},
			proofs: {},
		});
	});

	it("should validate agreement with sign proof", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SIGNED",
					naturalLanguageOfferContent: "Signed agreement",
					requirements: {
						"req-1": {
							type: DaiaRequirementType.SIGN,
							pubKey: "public-key",
							offererNonce: "offerer-nonce",
						},
					},
				}),
				signatures: {},
			},
			proofs: {
				"req-1": {
					type: DaiaRequirementType.SIGN,
					signeeNonce: "signee-nonce",
					signature: "signature-data",
				},
			},
		});
	});

	it("should validate agreement with payment proof", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "PAYMENT",
					naturalLanguageOfferContent: "Payment agreement",
					requirements: {
						"payment-req": {
							type: DaiaRequirementType.PAYMENT,
							to: "address",
							amount: 1000,
							auth: { type: "self" },
						},
					},
				}),
				signatures: {},
			},
			proofs: {
				"payment-req": {
					type: DaiaRequirementType.PAYMENT,
					txId: "payment-tx-id",
				},
			},
		});
	});

	it("should validate agreement with multiple proofs", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "MULTI-PROOF",
					naturalLanguageOfferContent: "Multiple proofs",
					requirements: {
						"sign-1": {
							type: DaiaRequirementType.SIGN,
							pubKey: "key-1",
							offererNonce: "nonce-1",
						},
						"sign-2": {
							type: DaiaRequirementType.SIGN,
							pubKey: "key-2",
							offererNonce: "nonce-2",
						},
					},
				}),
				signatures: {},
			},
			proofs: {
				"sign-1": {
					type: DaiaRequirementType.SIGN,
					signeeNonce: "signee-nonce-1",
					signature: "sig-1",
				},
				"sign-2": {
					type: DaiaRequirementType.SIGN,
					signeeNonce: "signee-nonce-2",
					signature: "sig-2",
				},
			},
		});
	});

	it("should validate agreement with self-signed requirements", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SELF-SIGNED",
					naturalLanguageOfferContent: "Self-signed agreement",
					requirements: {
						"self-sign": {
							type: DaiaRequirementType.SIGN,
							pubKey: "self-key",
							offererNonce: "self-nonce",
						},
					},
				}),
				signatures: {
					"self-sign": {
						signature: "self-signature",
					},
				},
			},
			proofs: {
				"self-sign": {
					type: DaiaRequirementType.SIGN,
					signeeNonce: "",
					signature: "proof-signature",
				},
			},
		});
	});

	it("should validate agreement with agreement reference proof", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "REFERENCE",
					naturalLanguageOfferContent: "Agreement with reference",
					requirements: {
						"ref-req": {
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
				"ref-req": {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					reference: "resolved-reference",
				},
			},
		});
	});

	it("should validate complex agreement with mixed proofs", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "COMPLEX",
					naturalLanguageOfferContent: "Complex agreement",
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
						reference: {
							type: DaiaRequirementType.AGREEMENT_REFERENCE,
							referenceType: "type",
							pointer: { type: "tx-id", txId: "tx" },
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
					txId: "payment-tx",
				},
				reference: {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					reference: "ref",
				},
			},
		});
	});

	it("should validate agreement with self payment proof", () => {
		DaiaAgreementSchema.parse({
			offerContent: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SELF-PAYMENT",
					naturalLanguageOfferContent: "Self payment",
					requirements: {},
				}),
				signatures: {},
			},
			proofs: {
				"self-pay": {
					type: DaiaRequirementType.PAYMENT,
					txId: "",
				},
			},
		});
	});
});
