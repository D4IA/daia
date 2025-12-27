import { describe, it, expect, vi } from "vitest";
import type { BlockchainTransactionFactory } from "@daia/blockchain";
import { DefaultDaiaOfferSigner } from "../signerImpl";
import {
	DaiaOfferContent,
	DaiaPaymentRequirementAuthType,
	DaiaRemoteAgreementPointerType,
	DaiaRequirementType,
} from "../../../defines";
import { DaiaSignRequirementResolver } from "../resolvers/signResolver";
import {
	DaiaPaymentRequirementResolver,
	DaiaPaymentRequirementResolutionType,
} from "../resolvers/paymentResolver";
import { DaiaReferenceRequirementResolver } from "../resolvers/referenceResolver";
import { DaiaOfferSignResponseType } from "../defines";

describe("DefaultDaiaOfferSigner", () => {
	const createMockSignResolver = (): DaiaSignRequirementResolver => ({
		createSignatureProof: vi.fn(),
	});

	const createMockPaymentResolver = (): DaiaPaymentRequirementResolver => ({
		createPaymentProof: vi.fn(),
	});

	const createMockReferenceResolver = (): DaiaReferenceRequirementResolver => ({
		createSignatureProof: vi.fn(),
	});

	const createMockTransactionFactory = (): BlockchainTransactionFactory => ({
		makeTransaction: vi.fn().mockResolvedValue({
			id: "test-transaction-id",
			data: { payments: {}, customData: "" },
			serializedTransaction: () => "serialized-tx",
			publish: vi.fn(),
		}),
	});

	describe("summarizeOffer", () => {
		it("should return empty payments for offer with no requirements", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});
			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.payments).toEqual({});
		});

		it("should summarize single payment requirement", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});
			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.payments).toEqual({
				address1: 100,
			});
		});

		it("should aggregate multiple payments to the same address", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});
			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
					payment2: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 50,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.payments).toEqual({
				address1: 150,
			});
		});

		it("should summarize payments to different addresses separately", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});
			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
					payment2: {
						type: DaiaRequirementType.PAYMENT,
						to: "address2",
						amount: 200,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.payments).toEqual({
				address1: 100,
				address2: 200,
			});
		});

		it("should ignore non-payment requirements", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});
			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					sign1: {
						type: DaiaRequirementType.SIGN,
						pubKey: "pubkey123",
						offererNonce: "nonce123",
					},
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const summary = await signer.summarizeOffer(offer);

			expect(summary.payments).toEqual({
				address1: 100,
			});
		});
	});

	describe("signOffer", () => {
		it("should successfully sign offer with SIGN requirement", async () => {
			const mockSignResolver = createMockSignResolver();
			vi.mocked(mockSignResolver.createSignatureProof).mockResolvedValue({
				nonce: "signee-nonce-123",
				sign: "signature-data",
			});

			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
				signResolver: mockSignResolver,
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					sign1: {
						type: DaiaRequirementType.SIGN,
						pubKey: "pubkey123",
						offererNonce: "offerer-nonce-123",
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.SUCCESS);
			if (response.type === DaiaOfferSignResponseType.SUCCESS) {
				expect(response.agreement.proofs["sign1"]).toEqual({
					type: DaiaRequirementType.SIGN,
					signeeNonce: "signee-nonce-123",
					signature: "signature-data",
				});
				expect(response.agreement.offerContentSerialized).toBe(JSON.stringify(offer));
				expect(mockSignResolver.createSignatureProof).toHaveBeenCalledWith(
					JSON.stringify(offer),
					"offerer-nonce-123",
					"pubkey123",
				);
			}
		});

		it("should fail when sign resolver is not provided", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					sign1: {
						type: DaiaRequirementType.SIGN,
						pubKey: "pubkey123",
						offererNonce: "offerer-nonce-123",
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.FAILURE);
			if (response.type === DaiaOfferSignResponseType.FAILURE) {
				expect(response.failedRequirementId).toBe("sign1");
			}
		});

		it("should fail when sign resolver returns null", async () => {
			const mockSignResolver = createMockSignResolver();
			vi.mocked(mockSignResolver.createSignatureProof).mockResolvedValue(null);

			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
				signResolver: mockSignResolver,
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					sign1: {
						type: DaiaRequirementType.SIGN,
						pubKey: "pubkey123",
						offererNonce: "offerer-nonce-123",
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.FAILURE);
			if (response.type === DaiaOfferSignResponseType.FAILURE) {
				expect(response.failedRequirementId).toBe("sign1");
			}
		});

		it("should successfully sign offer with self-authenticated PAYMENT requirement", async () => {
			const mockPaymentResolver = createMockPaymentResolver();
			vi.mocked(mockPaymentResolver.createPaymentProof).mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					address1: 100,
				},
			});

			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
				paymentResolver: mockPaymentResolver,
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.SUCCESS);
			if (response.type === DaiaOfferSignResponseType.SUCCESS) {
				expect(response.agreement.proofs["payment1"]).toEqual({
					type: DaiaRequirementType.PAYMENT,
					txId: "",
				});
				expect(response.internalTransactions).toHaveLength(0);
			}
		});

		it("should successfully sign offer with remote PAYMENT requirement", async () => {
			const mockPaymentResolver = createMockPaymentResolver();
			const mockTransactionHandle = {
				id: "tx-123",
				data: { payments: {}, customData: "" },
				serializedTransaction: () => "serialized",
				publish: vi.fn(),
			};

			vi.mocked(mockPaymentResolver.createPaymentProof).mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.REMOTE_TX,
				handle: mockTransactionHandle,
			});

			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
				paymentResolver: mockPaymentResolver,
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.REMOTE,
							paymentNonce: "payment-nonce-123",
						},
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.SUCCESS);
			if (response.type === DaiaOfferSignResponseType.SUCCESS) {
				expect(response.agreement.proofs["payment1"]).toEqual({
					type: DaiaRequirementType.PAYMENT,
					txId: "tx-123",
				});
				expect(response.internalTransactions).toHaveLength(1);
				expect(response.internalTransactions[0]).toBe(mockTransactionHandle);
			}
		});

		it("should fail when payment resolver is not provided", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.FAILURE);
			if (response.type === DaiaOfferSignResponseType.FAILURE) {
				expect(response.failedRequirementId).toBe("payment1");
			}
		});

		it("should successfully sign offer with AGREEMENT_REFERENCE requirement", async () => {
			const mockReferenceResolver = createMockReferenceResolver();
			vi.mocked(mockReferenceResolver.createSignatureProof).mockResolvedValue({
				pointer: {
					type: DaiaRemoteAgreementPointerType.TX_ID,
					txId: "referenced-tx-456",
				},
			});

			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
				referenceResolver: mockReferenceResolver,
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					ref1: {
						type: DaiaRequirementType.AGREEMENT_REFERENCE,
						referenceType: "some-reference-type",
						pointer: {
							type: DaiaRemoteAgreementPointerType.TX_ID,
							txId: "referenced-tx-456",
						},
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.SUCCESS);
			if (response.type === DaiaOfferSignResponseType.SUCCESS) {
				expect(response.agreement.proofs["ref1"]).toEqual({
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					reference: "referenced-tx-456",
				});
				expect(mockReferenceResolver.createSignatureProof).toHaveBeenCalledWith("some-reference-type");
			}
		});

		it("should fail when reference resolver is not provided", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					ref1: {
						type: DaiaRequirementType.AGREEMENT_REFERENCE,
						referenceType: "some-reference-type",
						pointer: {
							type: DaiaRemoteAgreementPointerType.TX_ID,
							txId: "referenced-tx-456",
						},
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.FAILURE);
			if (response.type === DaiaOfferSignResponseType.FAILURE) {
				expect(response.failedRequirementId).toBe("ref1");
			}
		});

		it("should successfully sign offer with multiple requirements", async () => {
			const mockSignResolver = createMockSignResolver();
			const mockPaymentResolver = createMockPaymentResolver();

			vi.mocked(mockSignResolver.createSignatureProof).mockResolvedValue({
				nonce: "signee-nonce-123",
				sign: "signature-data",
			});

			vi.mocked(mockPaymentResolver.createPaymentProof).mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					address1: 100,
				},
			});

			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
				signResolver: mockSignResolver,
				paymentResolver: mockPaymentResolver,
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {
					sign1: {
						type: DaiaRequirementType.SIGN,
						pubKey: "pubkey123",
						offererNonce: "offerer-nonce-123",
					},
					payment1: {
						type: DaiaRequirementType.PAYMENT,
						to: "address1",
						amount: 100,
						auth: {
							type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
						},
					},
				},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.SUCCESS);
			if (response.type === DaiaOfferSignResponseType.SUCCESS) {
				expect(response.agreement.proofs["sign1"]).toEqual({
					type: DaiaRequirementType.SIGN,
					signeeNonce: "signee-nonce-123",
					signature: "signature-data",
				});
				expect(response.agreement.proofs["payment1"]).toEqual({
					type: DaiaRequirementType.PAYMENT,
					txId: "",
				});
			}
		});

		it("should successfully sign empty offer", async () => {
			const signer = new DefaultDaiaOfferSigner({
				transactionFactory: createMockTransactionFactory(),
			});

			const offer: DaiaOfferContent = {
				offerTypeIdentifier: "test",
				naturalLanguageOfferContent: "Test offer",
				requirements: {},
			};

			const response = await signer.signOffer({ offer });

			expect(response.type).toBe(DaiaOfferSignResponseType.SUCCESS);
			if (response.type === DaiaOfferSignResponseType.SUCCESS) {
				expect(response.agreement.proofs).toEqual({});
				expect(response.internalTransactions).toHaveLength(0);
			}
		});
	});
});