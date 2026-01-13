import { describe, it } from "vitest";
import { DaiaOfferBuilder } from "../builder";
import { PrivateKey } from "@d4ia/blockchain-bridge";
import { DaiaPaymentRequirementAuthType, DaiaRemoteAgreementPointerType } from "../requirement";

describe("DaiaOfferBuilder", () => {
	it("should create a new builder instance", () => {
		DaiaOfferBuilder.new();
	});

	it("should set natural language content", () => {
		DaiaOfferBuilder.new().setNaturalLanguageContent("Test content");
	});

	it("should set offer type identifier", () => {
		DaiaOfferBuilder.new().setOfferTypeIdentifier("test-offer-type");
	});

	it("should build a basic offer with content and identifier", () => {
		DaiaOfferBuilder.new()
			.setNaturalLanguageContent("Sample offer")
			.setOfferTypeIdentifier("SAMPLE")
			.build();
	});

	it("should add a sign requirement", () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();

		DaiaOfferBuilder.new().setOfferTypeIdentifier("TEST").addSignRequirement(publicKey).build();
	});

	it("should add multiple sign requirements", () => {
		const key1 = PrivateKey.fromRandom();
		const key2 = PrivateKey.fromRandom();

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("MULTI-SIGN")
			.addSignRequirement(key1.toPublicKey().toString())
			.addSignRequirement(key2.toPublicKey().toString())
			.build();
	});

	it("should add a self-signed requirement", () => {
		const privateKey = PrivateKey.fromRandom();

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("SELF-SIGNED")
			.addSelfSignedRequirement(privateKey)
			.build();
	});

	it("should add multiple self-signed requirements", () => {
		const key1 = PrivateKey.fromRandom();
		const key2 = PrivateKey.fromRandom();

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("MULTI-SELF-SIGN")
			.addSelfSignedRequirement(key1)
			.addSelfSignedRequirement(key2)
			.build();
	});

	it("should add self-authenticated payment requirement", () => {
		const address = "test-address-123";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("PAYMENT")
			.addSelfAuthenticatedPaymentRequirement(address, 1000)
			.build();
	});

	it("should add self-authenticated payment with related transaction", () => {
		const address = "test-address-456";
		const relatedTx = "tx-id-123";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("PAYMENT-RELATED")
			.addSelfAuthenticatedPaymentRequirement(address, 2000, relatedTx)
			.build();
	});

	it("should add remote payment requirement", () => {
		const address = "remote-address-789";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("REMOTE-PAYMENT")
			.addRemotePaymentRequirement(address, 500)
			.build();
	});

	it("should add remote payment with custom nonce", () => {
		const address = "remote-address-101";
		const nonce = "custom-nonce-xyz";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("REMOTE-PAYMENT-NONCE")
			.addRemotePaymentRequirement(address, 750, nonce)
			.build();
	});

	it("should add payment requirement with explicit auth type", () => {
		const address = "explicit-address";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("EXPLICIT-PAYMENT")
			.addPaymentRequirement(address, 1500, DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED)
			.build();
	});

	it("should add agreement reference by transaction ID", () => {
		const txId = "test-transaction-id";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("AGREEMENT-REF")
			.addAgreementReferenceByTxId(txId, "reference-type")
			.build();
	});

	it("should add agreement reference without reference type", () => {
		const txId = "another-tx-id";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("AGREEMENT-REF-NO-TYPE")
			.addAgreementReferenceByTxId(txId)
			.build();
	});

	it("should add agreement reference requirement with pointer", () => {
		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("AGREEMENT-POINTER")
			.addAgreementReferenceRequirement("custom-reference", {
				type: DaiaRemoteAgreementPointerType.TX_ID,
				txId: "pointer-tx-id",
			})
			.build();
	});

	it("should build complex offer with mixed requirements", () => {
		const privateKey = PrivateKey.fromRandom();
		const address = "mixed-address";

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("COMPLEX-OFFER")
			.setNaturalLanguageContent("Complex offer with multiple requirements")
			.addSignRequirement(privateKey.toPublicKey().toString())
			.addSelfAuthenticatedPaymentRequirement(address, 1000)
			.addAgreementReferenceByTxId("reference-tx")
			.build();
	});

	it("should build offer with all requirement types", () => {
		const selfSignKey = PrivateKey.fromRandom();
		const signKey = PrivateKey.fromRandom();

		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("ALL-TYPES")
			.setNaturalLanguageContent("Offer with all requirement types")
			.addSelfSignedRequirement(selfSignKey)
			.addSignRequirement(signKey.toPublicKey().toString())
			.addSelfAuthenticatedPaymentRequirement("addr1", 500)
			.addRemotePaymentRequirement("addr2", 1000)
			.addAgreementReferenceByTxId("ref-tx")
			.build();
	});

	it("should chain multiple builder operations", () => {
		DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("CHAIN-TEST")
			.setNaturalLanguageContent("Testing method chaining")
			.setOfferTypeIdentifier("CHAIN-TEST-UPDATED")
			.setNaturalLanguageContent("Updated content")
			.build();
	});
});
