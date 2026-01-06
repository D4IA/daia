import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, BsvTransactionFactory, BsvNetwork } from "@d4ia/blockchain-bridge";
import type { UtxoProvider, UTXO } from "@d4ia/blockchain-bridge";

// Import from @bsv/sdk through blockchain's peer dependency
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Transaction, P2PKH } = require("@bsv/sdk");
import { DefaultDaiaOfferSigner } from "../signerImpl";
import {
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaInnerOfferContent,
	DaiaTransferOfferContent,
	DaiaOfferBuilder,
	DaiaRemoteAgreementPointerType,
} from "../../../defines";

// Mock UtxoProvider - provides fake UTXOs without hitting the network
class MockUtxoProvider implements UtxoProvider {
	async getUtxos(): Promise<UTXO[]> {
		return [
			{
				txid: "0000000000000000000000000000000000000000000000000000000000000001",
				vout: 0,
				satoshis: 100000,
				scriptPubKey: "76a914" + "00".repeat(20) + "88ac",
			},
		];
	}

	async getUtxosWithTotal(): Promise<UTXO[]> {
		return this.getUtxos();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async getSourceTransaction(): Promise<any> {
		const tx = new Transaction();
		const tempKey = PrivateKey.fromRandom();
		tx.addOutput({
			lockingScript: new P2PKH().lock(tempKey.toPublicKey().toHash() as number[]),
			satoshis: 100000,
		});
		return tx;
	}
}

describe("DefaultDaiaOfferSigner - Summarize Methods", () => {
	let privateKey: PrivateKey;
	let signer: DefaultDaiaOfferSigner;

	beforeEach(() => {
		privateKey = PrivateKey.fromRandom();
		const mockUtxoProvider = new MockUtxoProvider();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, mockUtxoProvider);

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: factory,
		});
	});

	describe("summarizeOfferContents", () => {
		it("should return offer content in summary", async () => {
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-OFFER",
				naturalLanguageOfferContent: "Test offer",
				requirements: {},
			};

			const summary = await signer.summarizeOfferContents(innerOffer);

			expect(summary.content).toBeDefined();
			expect(summary.content).toEqual(innerOffer);
			expect(summary.content.offerTypeIdentifier).toBe("TEST-OFFER");
			expect(summary.content.naturalLanguageOfferContent).toBe("Test offer");
		});

		it("should calculate payments correctly with no requirements", async () => {
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-NO-REQ",
				naturalLanguageOfferContent: "No requirements",
				requirements: {},
			};

			const summary = await signer.summarizeOfferContents(innerOffer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.payments).toEqual({});
			expect(summary.selfSignedData).toEqual({});
		});

		it("should calculate payments correctly with single payment requirement", async () => {
			const paymentAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-SINGLE-PAYMENT",
				naturalLanguageOfferContent: "Single payment",
				requirements: {
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						to: paymentAddress,
						amount: 1000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOfferContents(innerOffer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.payments).toEqual({
				[paymentAddress]: 1000,
			});
		});

		it("should aggregate multiple payments to the same address", async () => {
			const paymentAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-AGGREGATED-PAYMENTS",
				naturalLanguageOfferContent: "Multiple payments to same address",
				requirements: {
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						to: paymentAddress,
						amount: 1000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
					"payment-2": {
						type: DaiaRequirementType.PAYMENT,
						to: paymentAddress,
						amount: 2000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOfferContents(innerOffer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.payments).toEqual({
				[paymentAddress]: 3000,
			});
		});

		it("should handle payments to different addresses", async () => {
			const address1 = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
			const address2 = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-MULTIPLE-ADDRESSES",
				naturalLanguageOfferContent: "Payments to different addresses",
				requirements: {
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						to: address1,
						amount: 1000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
					"payment-2": {
						type: DaiaRequirementType.PAYMENT,
						to: address2,
						amount: 2000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOfferContents(innerOffer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.payments).toEqual({
				[address1]: 1000,
				[address2]: 2000,
			});
		});

		it("should ignore non-payment requirements when calculating payments", async () => {
			const paymentAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
			const publicKey = privateKey.toPublicKey().toString();

			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-MIXED-REQUIREMENTS",
				naturalLanguageOfferContent: "Mixed requirements",
				requirements: {
					"sign-1": {
						type: DaiaRequirementType.SIGN,
						offererNonce: "nonce-123",
						pubKey: publicKey,
					},
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						to: paymentAddress,
						amount: 1000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
					"reference-1": {
						type: DaiaRequirementType.AGREEMENT_REFERENCE,
						referenceType: "previous-agreement",
						pointer: {
							type: DaiaRemoteAgreementPointerType.TX_ID,
							txId: "0000000000000000000000000000000000000000000000000000000000000001",
						},
					},
				},
			};

			const summary = await signer.summarizeOfferContents(innerOffer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.payments).toEqual({
				[paymentAddress]: 1000,
			});
		});
	});

	describe("summarizeOffer", () => {
		it("should return inner offer content in summary", async () => {
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-TRANSFER",
				naturalLanguageOfferContent: "Transfer offer",
				requirements: {},
			};

			const offer: DaiaTransferOfferContent = {
				inner: JSON.stringify(innerOffer),
				signatures: {},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.content).toBeDefined();
			expect(summary.content).toEqual(innerOffer);
			expect(summary.content.offerTypeIdentifier).toBe("TEST-TRANSFER");
		});

		it("should include self-signed data from transfer offer", async () => {
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-SELF-SIGNED",
				naturalLanguageOfferContent: "Self-signed offer",
				requirements: {
					"sign-1": {
						type: DaiaRequirementType.SIGN,
						offererNonce: "nonce-456",
						pubKey: privateKey.toPublicKey().toString(),
					},
				},
			};

			const offer: DaiaTransferOfferContent = {
				inner: JSON.stringify(innerOffer),
				signatures: {
					"sign-1": {
						signature: "test-signature-data",
					},
				},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.selfSignedData).toEqual({
				"sign-1": {
					signature: "test-signature-data",
				},
			});
		});

		it("should handle offer with payments", async () => {
			const paymentAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
			const innerOffer: DaiaInnerOfferContent = {
				offerTypeIdentifier: "TEST-PAYMENT-OFFER",
				naturalLanguageOfferContent: "Offer with payment",
				requirements: {
					"payment-1": {
						type: DaiaRequirementType.PAYMENT,
						to: paymentAddress,
						amount: 5000,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const offer: DaiaTransferOfferContent = {
				inner: JSON.stringify(innerOffer),
				signatures: {},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.content).toEqual(innerOffer);
			expect(summary.payments).toEqual({
				[paymentAddress]: 5000,
			});
			expect(summary.selfSignedData).toEqual({});
		});

		it("should throw error when inner offer is invalid JSON", async () => {
			const offer: DaiaTransferOfferContent = {
				inner: "invalid json {{{",
				signatures: {},
			};

			await expect(signer.summarizeOffer(offer)).rejects.toThrow(
				"Deserialization of inner offer has failed"
			);
		});

		it("should work with offers created by DaiaOfferBuilder", async () => {
			const testPrivateKey = PrivateKey.fromRandom();
			const offer = DaiaOfferBuilder.new()
				.setOfferTypeIdentifier("TEST-BUILDER")
				.setNaturalLanguageContent("Built with builder")
				.addSelfSignedRequirement(testPrivateKey)
				.build();

			const summary = await signer.summarizeOffer(offer);

			expect(summary.content).toBeDefined();
			expect(summary.content.offerTypeIdentifier).toBe("TEST-BUILDER");
			expect(summary.content.naturalLanguageOfferContent).toBe("Built with builder");
			expect(Object.keys(summary.selfSignedData).length).toBe(1);
		});
	});
});
