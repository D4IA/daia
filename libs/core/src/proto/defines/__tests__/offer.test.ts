import { describe, it } from "vitest";
import {
	DaiaInnerOfferContentSchema,
	DaiaOfferSelfSignedDataSchema,
	DaiaTransferOfferContentSchema,
} from "../offer";
import { DaiaRequirementType } from "../requirement";

describe("DaiaOfferSchemas", () => {
	it("should validate DaiaOfferSelfSignedData with signature", () => {
		DaiaOfferSelfSignedDataSchema.parse({
			signature: "test-signature-base64",
		});
	});

	it("should validate DaiaInnerOfferContent with empty requirements", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "TEST-OFFER",
			naturalLanguageOfferContent: "Test offer content",
			requirements: {},
		});
	});

	it("should validate DaiaInnerOfferContent with sign requirement", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "SIGN-OFFER",
			naturalLanguageOfferContent: "Offer with sign requirement",
			requirements: {
				"req-1": {
					type: DaiaRequirementType.SIGN,
					pubKey: "test-public-key",
					offererNonce: "nonce-123",
				},
			},
		});
	});

	it("should validate DaiaInnerOfferContent with payment requirement", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "PAYMENT-OFFER",
			naturalLanguageOfferContent: "Offer with payment",
			requirements: {
				"req-payment": {
					type: DaiaRequirementType.PAYMENT,
					to: "payment-address",
					amount: 1000,
					auth: {
						type: "self",
					},
				},
			},
		});
	});

	it("should validate DaiaInnerOfferContent with multiple requirements", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "MULTI-REQ",
			naturalLanguageOfferContent: "Multiple requirements",
			requirements: {
				"req-1": {
					type: DaiaRequirementType.SIGN,
					pubKey: "key-1",
					offererNonce: "nonce-1",
				},
				"req-2": {
					type: DaiaRequirementType.PAYMENT,
					to: "addr",
					amount: 500,
					auth: { type: "self" },
				},
			},
		});
	});

	it("should validate DaiaTransferOfferContent without signatures", () => {
		DaiaTransferOfferContentSchema.parse({
			inner: JSON.stringify({
				offerTypeIdentifier: "TEST",
				naturalLanguageOfferContent: "Content",
				requirements: {},
			}),
			signatures: {},
		});
	});

	it("should validate DaiaTransferOfferContent with signatures", () => {
		DaiaTransferOfferContentSchema.parse({
			inner: JSON.stringify({
				offerTypeIdentifier: "SELF-SIGNED",
				naturalLanguageOfferContent: "Self-signed offer",
				requirements: {
					"req-1": {
						type: DaiaRequirementType.SIGN,
						pubKey: "key",
						offererNonce: "nonce",
					},
				},
			}),
			signatures: {
				"req-1": {
					signature: "signature-data",
				},
			},
		});
	});

	it("should validate DaiaTransferOfferContent with multiple signatures", () => {
		DaiaTransferOfferContentSchema.parse({
			inner: JSON.stringify({
				offerTypeIdentifier: "MULTI-SELF-SIGNED",
				naturalLanguageOfferContent: "Multiple self-signed",
				requirements: {},
			}),
			signatures: {
				"req-1": { signature: "sig1" },
				"req-2": { signature: "sig2" },
				"req-3": { signature: "sig3" },
			},
		});
	});

	it("should validate DaiaInnerOfferContent with agreement reference requirement", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "AGREEMENT-REF",
			naturalLanguageOfferContent: "Reference to another agreement",
			requirements: {
				"ref-req": {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					referenceType: "parent-agreement",
					pointer: {
						type: "tx-id",
						txId: "referenced-tx-id",
					},
				},
			},
		});
	});

	it("should validate payment requirement with remote auth", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "REMOTE-PAYMENT",
			naturalLanguageOfferContent: "Remote payment offer",
			requirements: {
				"payment-req": {
					type: DaiaRequirementType.PAYMENT,
					to: "remote-address",
					amount: 2000,
					auth: {
						type: "remote",
						paymentNonce: "payment-nonce-xyz",
					},
				},
			},
		});
	});

	it("should validate payment requirement with related transaction", () => {
		DaiaInnerOfferContentSchema.parse({
			offerTypeIdentifier: "RELATED-TX",
			naturalLanguageOfferContent: "Payment with related tx",
			requirements: {
				"exit-payment": {
					type: DaiaRequirementType.PAYMENT,
					to: "exit-address",
					amount: 1500,
					relatedTx: "entry-tx-id",
					auth: { type: "self" },
				},
			},
		});
	});
});
