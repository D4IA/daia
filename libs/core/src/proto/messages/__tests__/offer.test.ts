import { describe, it } from "vitest";
import { DaiaOfferMessageSchema } from "../offer";
import { DaiaMessageType } from "../common";

describe("DaiaOfferMessageSchema", () => {
	it("should validate offer message with empty requirements", () => {
		DaiaOfferMessageSchema.parse({
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "TEST-OFFER",
					naturalLanguageOfferContent: "Test content",
					requirements: {},
				}),
				signatures: {},
			},
		});
	});

	it("should validate offer message with sign requirement", () => {
		DaiaOfferMessageSchema.parse({
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SIGN-OFFER",
					naturalLanguageOfferContent: "Offer requiring signature",
					requirements: {
						"req-1": {
							type: "sign",
							pubKey: "public-key-123",
							offererNonce: "nonce-abc",
						},
					},
				}),
				signatures: {},
			},
		});
	});

	it("should validate offer message with self-signed requirement", () => {
		DaiaOfferMessageSchema.parse({
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SELF-SIGNED",
					naturalLanguageOfferContent: "Self-signed offer",
					requirements: {
						"self-req": {
							type: "sign",
							pubKey: "self-key",
							offererNonce: "self-nonce",
						},
					},
				}),
				signatures: {
					"self-req": {
						signature: "self-signature-data",
					},
				},
			},
		});
	});

	it("should validate offer message with payment requirement", () => {
		DaiaOfferMessageSchema.parse({
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "PAYMENT-OFFER",
					naturalLanguageOfferContent: "Paid offer",
					requirements: {
						payment: {
							type: "payment",
							to: "payment-address",
							amount: 1000,
							auth: { type: "self" },
						},
					},
				}),
				signatures: {},
			},
		});
	});

	it("should validate offer message with multiple requirements", () => {
		DaiaOfferMessageSchema.parse({
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "MULTI-REQ",
					naturalLanguageOfferContent: "Multiple requirements",
					requirements: {
						"sign-1": {
							type: "sign",
							pubKey: "key-1",
							offererNonce: "nonce-1",
						},
						"payment-1": {
							type: "payment",
							to: "addr-1",
							amount: 500,
							auth: { type: "self" },
						},
					},
				}),
				signatures: {},
			},
		});
	});

	it("should validate offer with agreement reference", () => {
		DaiaOfferMessageSchema.parse({
			type: DaiaMessageType.OFFER,
			content: {
				inner: JSON.stringify({
					offerTypeIdentifier: "REF-OFFER",
					naturalLanguageOfferContent: "Referenced offer",
					requirements: {
						ref: {
							type: "agreement-reference",
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
		});
	});
});
