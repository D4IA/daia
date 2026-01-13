import { describe, it } from "vitest";
import { DaiaTransactionDataSchema, DaiaTransactionDataType } from "../data";

describe("DaiaTransactionDataSchema", () => {
	it("should validate agreement transaction data", () => {
		DaiaTransactionDataSchema.parse({
			type: DaiaTransactionDataType.AGREEMENT,
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
		});
	});

	it("should validate payment identifier transaction data", () => {
		DaiaTransactionDataSchema.parse({
			type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
			paymentNonce: "payment-nonce-123",
		});
	});

	it("should validate agreement with complex structure", () => {
		DaiaTransactionDataSchema.parse({
			type: DaiaTransactionDataType.AGREEMENT,
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "COMPLEX",
						naturalLanguageOfferContent: "Complex agreement",
						requirements: {
							"req-1": {
								type: "sign",
								pubKey: "key",
								offererNonce: "nonce",
							},
						},
					}),
					signatures: {
						"req-1": {
							signature: "sig-data",
						},
					},
				},
				proofs: {
					"req-1": {
						type: "sign",
						signeeNonce: "s-nonce",
						signature: "proof-sig",
					},
				},
			},
		});
	});

	it("should validate payment identifier with UUID format nonce", () => {
		DaiaTransactionDataSchema.parse({
			type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
			paymentNonce: "550e8400-e29b-41d4-a716-446655440000",
		});
	});

	it("should validate payment identifier with custom nonce", () => {
		DaiaTransactionDataSchema.parse({
			type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
			paymentNonce: "custom-payment-nonce-xyz",
		});
	});

	it("should validate agreement with multiple proofs", () => {
		DaiaTransactionDataSchema.parse({
			type: DaiaTransactionDataType.AGREEMENT,
			agreement: {
				offerContent: {
					inner: JSON.stringify({
						offerTypeIdentifier: "MULTI",
						naturalLanguageOfferContent: "Multi-proof agreement",
						requirements: {},
					}),
					signatures: {},
				},
				proofs: {
					"proof-1": {
						type: "sign",
						signeeNonce: "nonce-1",
						signature: "sig-1",
					},
					"proof-2": {
						type: "payment",
						txId: "tx-1",
					},
				},
			},
		});
	});
});
