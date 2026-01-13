import { describe, it, expect } from "vitest";
import { DaiaOfferSignResponseType, DaiaOfferSignRequest } from "../defines";
import { DaiaRequirementType } from "../../../defines";

describe("DaiaOfferSignTypes", () => {
	it("should create sign request with empty offer", () => {
		const request: DaiaOfferSignRequest = {
			offer: {
				inner: JSON.stringify({
					offerTypeIdentifier: "TEST",
					naturalLanguageOfferContent: "Test",
					requirements: {},
				}),
				signatures: {},
			},
		};
		expect(request.offer).toBeDefined();
	});

	it("should create sign request with sign requirement", () => {
		const request: DaiaOfferSignRequest = {
			offer: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SIGN-REQ",
					naturalLanguageOfferContent: "Requires signature",
					requirements: {
						"req-1": {
							type: DaiaRequirementType.SIGN,
							pubKey: "test-key",
							offererNonce: "nonce-123",
						},
					},
				}),
				signatures: {},
			},
		};
		expect(request.offer).toBeDefined();
	});

	it("should create success response type", () => {
		const responseType = DaiaOfferSignResponseType.SUCCESS;
		expect(responseType).toBeDefined();
	});

	it("should create requirement failure response type", () => {
		const responseType = DaiaOfferSignResponseType.REQUIREMENT_FAILURE;
		expect(responseType).toBeDefined();
	});

	it("should create sign request with payment requirement", () => {
		const request: DaiaOfferSignRequest = {
			offer: {
				inner: JSON.stringify({
					offerTypeIdentifier: "PAYMENT",
					naturalLanguageOfferContent: "Payment offer",
					requirements: {
						"payment-req": {
							type: DaiaRequirementType.PAYMENT,
							to: "addr",
							amount: 1000,
							auth: { type: "self" },
						},
					},
				}),
				signatures: {},
			},
		};
		expect(request.offer).toBeDefined();
	});

	it("should create sign request with self-signed requirement", () => {
		const request: DaiaOfferSignRequest = {
			offer: {
				inner: JSON.stringify({
					offerTypeIdentifier: "SELF-SIGN",
					naturalLanguageOfferContent: "Self-signed",
					requirements: {
						"self-req": {
							type: DaiaRequirementType.SIGN,
							pubKey: "self-key",
							offererNonce: "self-nonce",
						},
					},
				}),
				signatures: {
					"self-req": {
						signature: "self-sig",
					},
				},
			},
		};
		expect(request.offer).toBeDefined();
	});

	it("should create sign request with multiple requirements", () => {
		const request: DaiaOfferSignRequest = {
			offer: {
				inner: JSON.stringify({
					offerTypeIdentifier: "MULTI",
					naturalLanguageOfferContent: "Multiple requirements",
					requirements: {
						"sign-1": {
							type: DaiaRequirementType.SIGN,
							pubKey: "key-1",
							offererNonce: "nonce-1",
						},
						"payment-1": {
							type: DaiaRequirementType.PAYMENT,
							to: "addr-1",
							amount: 500,
							auth: { type: "self" },
						},
					},
				}),
				signatures: {},
			},
		};
		expect(request.offer).toBeDefined();
	});

	it("should create sign request with agreement reference", () => {
		const request: DaiaOfferSignRequest = {
			offer: {
				inner: JSON.stringify({
					offerTypeIdentifier: "REF",
					naturalLanguageOfferContent: "With reference",
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
		};
		expect(request.offer).toBeDefined();
	});
});
