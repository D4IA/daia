import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrivateKey } from "@bsv/sdk";
import { DefaultDaiaOfferSigner } from "../../sign/signerImpl";
import { DefaultDaiaAgreementVerifier } from "../impl";
import {
	DaiaOfferContent,
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaRemoteAgreementPointerType,
} from "../../../defines";
import { DaiaOfferSignResponseType } from "../../sign/defines";
import { DaiaAgreementVerificationResult } from "../defines";
import type {
	BlockchainTransactionFactory,
	BlockchainTransactionParser,
	CreatedBlockchainTransactionHandle,
	ParsedBlockchainTransactionHandle,
} from "@daia/blockchain";
import { DaiaSignRequirementResolver } from "../../sign/resolvers/signResolver";
import {
	DaiaPaymentRequirementResolver,
	DaiaPaymentRequirementResolutionType,
} from "../../sign/resolvers/paymentResolver";
import { DaiaTransactionDataType } from "../../../blockchain";

// Mock blockchain parser that stores transactions in memory
class MockBlockchainParser implements BlockchainTransactionParser {
	private transactions: Map<string, ParsedBlockchainTransactionHandle> = new Map();

	addTransaction(tx: ParsedBlockchainTransactionHandle): void {
		this.transactions.set(tx.id, tx);
	}

	async findTransactionById(txId: string): Promise<ParsedBlockchainTransactionHandle | null> {
		return this.transactions.get(txId) ?? null;
	}

	async parseTransaction(serializedTransaction: string): Promise<ParsedBlockchainTransactionHandle> {
		throw new Error(`Not implemented in mock: ${serializedTransaction}`);
	}
}

// Mock transaction factory that creates transactions and adds them to parser
class MockTransactionFactory implements BlockchainTransactionFactory {
	private txCounter = 0;

	constructor(private readonly parser: MockBlockchainParser) {}

	async makeTransaction(data: {
		payments: { [to: string]: number };
		customData: string | null;
	}): Promise<CreatedBlockchainTransactionHandle> {
		const txId = `tx-${++this.txCounter}`;

		// Extract the agreement from the DaiaTransactionData wrapper for storage
		// The verifier expects the raw agreement JSON, not wrapped
		let customDataForStorage = data.customData;
		if (data.customData) {
			try {
				const parsed = JSON.parse(data.customData);
				if (parsed.type === DaiaTransactionDataType.AGREEMENT && parsed.agreement) {
					// Store just the agreement, not the wrapper
					customDataForStorage = JSON.stringify(parsed.agreement);
				}
			} catch {
				// If parsing fails, use as-is
			}
		}

		const handle: CreatedBlockchainTransactionHandle = {
			id: txId,
			data: {
				payments: data.payments,
				customData: data.customData,
			},
			serializedTransaction: () => JSON.stringify({ id: txId, ...data }),
			publish: vi.fn().mockResolvedValue(undefined),
		};

		// Add the transaction to the parser for verification with unwrapped agreement
		this.parser.addTransaction({
			id: txId,
			data: {
				payments: data.payments,
				customData: customDataForStorage,
			},
			serializedTransaction: () => JSON.stringify({ id: txId, ...data }),
			isFinalized: false,
		});

		return handle;
	}
}

// Sign resolver that uses real BSV cryptography
class RealSignResolver implements DaiaSignRequirementResolver {
	constructor(private readonly privateKey: PrivateKey) {}

	async createSignatureProof(
		serializedOffer: string,
		offererNonce: string,
		_pubKey: string, // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<{ nonce: string; sign: string } | null> {
		const signeeNonce = Math.random().toString(36).substring(7);
		const messageToSign = offererNonce + signeeNonce + serializedOffer;
		const messageBytes = Array.from(Buffer.from(messageToSign, "utf8"));
		const signature = this.privateKey.sign(messageBytes);
		const signatureDERRaw = signature.toDER("base64");
		const signatureDER =
			typeof signatureDERRaw === "string"
				? signatureDERRaw
				: Buffer.from(signatureDERRaw).toString("base64");

		return {
			nonce: signeeNonce,
			sign: signatureDER,
		};
	}
}

describe("DefaultDaiaOfferSigner + DefaultDaiaAgreementVerifier Integration", () => {
	let mockParser: MockBlockchainParser;
	let mockFactory: MockTransactionFactory;
	let signer: DefaultDaiaOfferSigner;
	let verifier: DefaultDaiaAgreementVerifier;
	let privateKey: PrivateKey;
	let publicKey: string;

	beforeEach(() => {
		mockParser = new MockBlockchainParser();
		mockFactory = new MockTransactionFactory(mockParser);
		privateKey = PrivateKey.fromRandom();
		publicKey = privateKey.toPublicKey().toString();

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: mockFactory,
			signResolver: new RealSignResolver(privateKey),
		});

		verifier = new DefaultDaiaAgreementVerifier(mockParser);
	});

	it("should successfully sign and verify an offer with SIGN requirement", async () => {
		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "This is a test offer that requires a signature",
			requirements: {
				signature1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey,
					sign: null,
					offererNonce: "nonce-" + Math.random(),
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Verify the signed agreement
		const verifyResponse = await verifier.verifyAgreement({
			agreement: signResponse.agreement,
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.PASSED) {
			expect(verifyResponse.totalAgreementPayments).toBeNull();
		}
	});

	it("should successfully sign and verify an offer with self-authenticated PAYMENT requirement", async () => {
		const mockPaymentResolver: DaiaPaymentRequirementResolver = {
			createPaymentProof: vi.fn().mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"recipient-address": 1000,
				},
			}),
		};

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: mockFactory,
			paymentResolver: mockPaymentResolver,
		});

		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "payment-offer",
			naturalLanguageOfferContent: "This offer requires a payment",
			requirements: {
				payment1: {
					type: DaiaRequirementType.PAYMENT,
					to: "recipient-address",
					amount: 1000,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Verify the signed agreement with transaction data
		const verifyResponse = await verifier.verifyAgreement({
			agreement: signResponse.agreement,
			transactionData: {
				payments: {
					"recipient-address": 1000,
				},
			},
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.PASSED) {
			expect(verifyResponse.totalAgreementPayments).toEqual({
				"recipient-address": 1000,
			});
		}
	});

	it("should successfully sign and verify an offer with multiple requirements", async () => {
		const mockPaymentResolver: DaiaPaymentRequirementResolver = {
			createPaymentProof: vi.fn().mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"alice-address": 500,
					"bob-address": 300,
				},
			}),
		};

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: mockFactory,
			signResolver: new RealSignResolver(privateKey),
			paymentResolver: mockPaymentResolver,
		});

		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "complex-offer",
			naturalLanguageOfferContent: "This offer requires signature and payments",
			requirements: {
				signature1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey,
					sign: null,
					offererNonce: "nonce-" + Math.random(),
				},
				payment1: {
					type: DaiaRequirementType.PAYMENT,
					to: "alice-address",
					amount: 500,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
				payment2: {
					type: DaiaRequirementType.PAYMENT,
					to: "bob-address",
					amount: 300,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Verify the signed agreement
		const verifyResponse = await verifier.verifyAgreement({
			agreement: signResponse.agreement,
			transactionData: {
				payments: {
					"alice-address": 500,
					"bob-address": 300,
				},
			},
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.PASSED) {
			expect(verifyResponse.totalAgreementPayments).toEqual({
				"alice-address": 500,
				"bob-address": 300,
			});
		}
	});

	it("should fail verification when payment amounts don't match", async () => {
		const mockPaymentResolver: DaiaPaymentRequirementResolver = {
			createPaymentProof: vi.fn().mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.SELF_AUTHENTICATED,
				payments: {
					"recipient-address": 1000,
				},
			}),
		};

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: mockFactory,
			paymentResolver: mockPaymentResolver,
		});

		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "payment-offer",
			naturalLanguageOfferContent: "This offer requires a payment",
			requirements: {
				payment1: {
					type: DaiaRequirementType.PAYMENT,
					to: "recipient-address",
					amount: 1000,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Verify with WRONG payment amount
		const verifyResponse = await verifier.verifyAgreement({
			agreement: signResponse.agreement,
			transactionData: {
				payments: {
					"recipient-address": 500, // Wrong amount!
				},
			},
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
	});

	it("should successfully sign and verify an offer with AGREEMENT_REFERENCE", async () => {
		// First, create and sign a referenced agreement
		const referencedOffer: DaiaOfferContent = {
			offerTypeIdentifier: "referenced-offer",
			naturalLanguageOfferContent: "This is the referenced agreement",
			requirements: {
				signature1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey,
					sign: null,
					offererNonce: "ref-nonce-" + Math.random(),
				},
			},
		};

		const refSignResponse = await signer.signOffer({ offer: referencedOffer });
		expect(refSignResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (refSignResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response for referenced agreement");
		}

		const referencedTxId = refSignResponse.transaction.id;

		// Now create an offer that references the first agreement
		const mockReferenceResolver = {
			createSignatureProof: vi.fn().mockResolvedValue({
				pointer: {
					type: DaiaRemoteAgreementPointerType.TX_ID,
					txId: referencedTxId,
				},
			}),
		};

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: mockFactory,
			signResolver: new RealSignResolver(privateKey),
			referenceResolver: mockReferenceResolver,
		});

		const mainOffer: DaiaOfferContent = {
			offerTypeIdentifier: "main-offer",
			naturalLanguageOfferContent: "This offer references another agreement",
			requirements: {
				signature1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey,
					sign: null,
					offererNonce: "main-nonce-" + Math.random(),
				},
				reference1: {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					referenceType: "parent-agreement",
					pointer: {
						type: DaiaRemoteAgreementPointerType.TX_ID,
						txId: referencedTxId,
					},
				},
			},
		};

		// Sign the main offer
		const mainSignResponse = await signer.signOffer({ offer: mainOffer });
		expect(mainSignResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (mainSignResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response for main agreement");
		}

		// Verify the main agreement (which should recursively verify the referenced agreement)
		const verifyResponse = await verifier.verifyAgreement({
			agreement: mainSignResponse.agreement,
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);
	});

	it("should successfully sign and verify an empty offer", async () => {
		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "empty-offer",
			naturalLanguageOfferContent: "This offer has no requirements",
			requirements: {},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Verify the signed agreement
		const verifyResponse = await verifier.verifyAgreement({
			agreement: signResponse.agreement,
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.PASSED) {
			expect(verifyResponse.totalAgreementPayments).toBeNull();
		}
	});

	it("should fail verification when signature is tampered with", async () => {
		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "This is a test offer",
			requirements: {
				signature1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey,
					sign: null,
					offererNonce: "nonce-" + Math.random(),
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Tamper with the signature
		const originalProof = signResponse.agreement.proofs["signature1"];
		const tamperedAgreement = {
			...signResponse.agreement,
			proofs: {
				signature1: {
					type: DaiaRequirementType.SIGN as const,
					signeeNonce: originalProof && "signeeNonce" in originalProof ? originalProof.signeeNonce : "",
					signature: "TAMPERED_SIGNATURE",
				},
			},
		};

		// Verification should fail
		const verifyResponse = await verifier.verifyAgreement({
			agreement: tamperedAgreement,
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
	});

	it("should fail verification when offer content is modified after signing", async () => {
		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "Original content",
			requirements: {
				signature1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey,
					sign: null,
					offererNonce: "nonce-" + Math.random(),
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		// Modify the offer content after signing
		const modifiedOffer = {
			...offer,
			naturalLanguageOfferContent: "Modified content",
		};

		const tamperedAgreement = {
			offerContentSerialized: JSON.stringify(modifiedOffer),
			proofs: signResponse.agreement.proofs,
		};

		// Verification should fail because signature won't match modified content
		const verifyResponse = await verifier.verifyAgreement({
			agreement: tamperedAgreement,
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
	});

	it("should handle remote payment transactions correctly", async () => {
		const remotePaymentTxId = "remote-payment-tx-123";
		const paymentNonce = "payment-nonce-" + Math.random();

		const mockPaymentResolver: DaiaPaymentRequirementResolver = {
			createPaymentProof: vi.fn().mockResolvedValue({
				type: DaiaPaymentRequirementResolutionType.REMOTE_TX,
				handle: {
					id: remotePaymentTxId,
					data: {
						payments: { "recipient-address": 2000 },
						customData: "",
					},
					serializedTransaction: () => "serialized",
					publish: vi.fn(),
				},
			}),
		};

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: mockFactory,
			paymentResolver: mockPaymentResolver,
		});

		const offer: DaiaOfferContent = {
			offerTypeIdentifier: "remote-payment-offer",
			naturalLanguageOfferContent: "This offer requires a remote payment",
			requirements: {
				payment1: {
					type: DaiaRequirementType.PAYMENT,
					to: "recipient-address",
					amount: 2000,
					auth: {
						type: DaiaPaymentRequirementAuthType.REMOTE,
						paymentNonce: paymentNonce,
					},
				},
			},
		};

		// Sign the offer
		const signResponse = await signer.signOffer({ offer });

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Expected successful sign response");
		}

		expect(signResponse.internalTransactions).toHaveLength(1);
		if (signResponse.internalTransactions[0]) {
			expect(signResponse.internalTransactions[0].id).toBe(remotePaymentTxId);
		}

		// Add the remote payment transaction to the parser for verification
		mockParser.addTransaction({
			id: remotePaymentTxId,
			data: {
				payments: { "recipient-address": 2000 },
				customData: JSON.stringify({
					type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
					paymentNonce: paymentNonce,
				}),
			},
			serializedTransaction: () => "serialized-remote-payment",
			isFinalized: true,
		});

		// Verify the signed agreement
		const verifyResponse = await verifier.verifyAgreement({
			agreement: signResponse.agreement,
		});

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);
	});
});
