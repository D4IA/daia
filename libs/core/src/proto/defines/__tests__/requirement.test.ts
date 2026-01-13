import { describe, it } from "vitest";
import {
	DaiaOfferRequirementSchema,
	DaiaOfferProofSchema,
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaRemoteAgreementPointerType,
	DaiaRemoteAgreementPointerSchema,
} from "../requirement";

describe("DaiaRequirementSchemas", () => {
	it("should validate sign requirement", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.SIGN,
			pubKey: "test-public-key",
			offererNonce: "random-nonce-123",
		});
	});

	it("should validate payment requirement with self authentication", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "payment-address",
			amount: 1000,
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});

	it("should validate payment requirement with remote authentication", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "remote-address",
			amount: 2000,
			auth: {
				type: DaiaPaymentRequirementAuthType.REMOTE,
				paymentNonce: "payment-nonce-xyz",
			},
		});
	});

	it("should validate payment requirement with related transaction", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "exit-address",
			amount: 1500,
			relatedTx: "entry-transaction-id",
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});

	it("should validate agreement reference requirement", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.AGREEMENT_REFERENCE,
			referenceType: "parent-agreement",
			pointer: {
				type: DaiaRemoteAgreementPointerType.TX_ID,
				txId: "referenced-tx-id",
			},
		});
	});

	it("should validate agreement reference with empty reference type", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.AGREEMENT_REFERENCE,
			referenceType: "",
			pointer: {
				type: DaiaRemoteAgreementPointerType.TX_ID,
				txId: "tx-123",
			},
		});
	});

	it("should validate remote agreement pointer", () => {
		DaiaRemoteAgreementPointerSchema.parse({
			type: DaiaRemoteAgreementPointerType.TX_ID,
			txId: "transaction-identifier",
		});
	});

	it("should validate sign proof with signee nonce", () => {
		DaiaOfferProofSchema.parse({
			type: DaiaRequirementType.SIGN,
			signeeNonce: "signee-random-nonce",
			signature: "signature-data-base64",
		});
	});

	it("should validate sign proof with empty signee nonce for self-signed", () => {
		DaiaOfferProofSchema.parse({
			type: DaiaRequirementType.SIGN,
			signeeNonce: "",
			signature: "self-signature-data",
		});
	});

	it("should validate payment proof with transaction ID", () => {
		DaiaOfferProofSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			txId: "payment-transaction-id",
		});
	});

	it("should validate payment proof with empty transaction ID for self-paid", () => {
		DaiaOfferProofSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			txId: "",
		});
	});

	it("should validate agreement reference proof", () => {
		DaiaOfferProofSchema.parse({
			type: DaiaRequirementType.AGREEMENT_REFERENCE,
			reference: "resolved-agreement-reference",
		});
	});

	it("should validate multiple payment requirements with different auth types", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "address-1",
			amount: 100,
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});

		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "address-2",
			amount: 200,
			auth: {
				type: DaiaPaymentRequirementAuthType.REMOTE,
				paymentNonce: "nonce-2",
			},
		});
	});

	it("should validate payment with zero amount", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "zero-address",
			amount: 0,
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});

	it("should validate payment with large amount", () => {
		DaiaOfferRequirementSchema.parse({
			type: DaiaRequirementType.PAYMENT,
			to: "large-payment-address",
			amount: 999999999,
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});
});
