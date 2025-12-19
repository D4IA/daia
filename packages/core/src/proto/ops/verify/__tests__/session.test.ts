import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey } from "@bsv/sdk";
import { DaiaAgreementVerifySession } from "../session";
import {
	DaiaAgreementVerificationResult,
	DaiaAgreementVerificationFailureType,
	DaiaAgreementVerifyRequest,
} from "../defines";
import {
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaRemoteAgreementPointerType,
} from "../../../defines";
import type {
	BlockchainTransactionParser,
	ParsedBlockchainTransactionHandle,
} from "@daia/blockchain";

// Custom mock blockchain parser implementation
class MockBlockchainParser implements BlockchainTransactionParser {
	private transactions: Map<string, ParsedBlockchainTransactionHandle | null> = new Map();

	setTransaction(txId: string, transaction: ParsedBlockchainTransactionHandle | null): void {
		this.transactions.set(txId, transaction);
	}

	async findTransactionById(txId: string): Promise<ParsedBlockchainTransactionHandle | null> {
		if (this.transactions.has(txId)) {
			return this.transactions.get(txId) ?? null;
		}
		return null;
	}

	async parseTransaction(serializedTransaction: string): Promise<ParsedBlockchainTransactionHandle> {
		throw new Error(`Not implemented in mock: ${serializedTransaction}`);
	}
}

const createMockBlockchainParser = (): MockBlockchainParser => {
	return new MockBlockchainParser();
};

describe("DaiaAgreementVerifySession", () => {
	let mockParser: MockBlockchainParser;

	beforeEach(() => {
		mockParser = createMockBlockchainParser();
	});

	it("should successfully verify an agreement with valid signature requirement", async () => {
		// Create a real keypair and signature for testing
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();

		const offererNonce = "nonce123";
		const signeeNonce = "signee456";

		const offerContent = {
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "Test offer content",
			requirements: {
				req1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey.toString(),
					sign: null,
					offererNonce,
				},
			},
		};

		const offerContentSerialized = JSON.stringify(offerContent);

		// Create a real signature
		const messageToSign = offererNonce + signeeNonce + offerContentSerialized;
		const messageBytes = Array.from(Buffer.from(messageToSign, "utf8"));
		const signature = privateKey.sign(messageBytes);
		const signatureDERRaw = signature.toDER("base64");
		const signatureDER =
			typeof signatureDERRaw === "string"
				? signatureDERRaw
				: Buffer.from(signatureDERRaw).toString("base64");

		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContentSerialized,
				proofs: {
					req1: {
						type: DaiaRequirementType.SIGN,
						signeeNonce,
						signature: signatureDER,
					},
				},
			},
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		expect(result.result).toBe(DaiaAgreementVerificationResult.PASSED);
		if (result.result === DaiaAgreementVerificationResult.PASSED) {
			expect(result.totalAgreementPayments).toBeNull();
		}
	});

	it("should fail verification when requirements and proofs don't match", async () => {
		// Setup: Create an agreement with mismatched requirements and proofs
		const offerContent = {
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "Test offer content",
			requirements: {
				req1: {
					type: DaiaRequirementType.SIGN,
					pubKey: "02f3d17ca1ac6dcf42b0297a71abb87f79dfa2c66278caf9103b729f7bb9d6a615",
					sign: null,
					offererNonce: "nonce123",
				},
				req2: {
					type: DaiaRequirementType.PAYMENT,
					to: "address123",
					amount: 1000,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
			},
		};

		const offerContentSerialized = JSON.stringify(offerContent);

		// Only provide proof for req1, not req2
		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContentSerialized,
				proofs: {
					req1: {
						type: DaiaRequirementType.SIGN,
						signeeNonce: "signee456",
						signature:
							"MEUCIQDxKxYrz8GdHbLNqfxJA9OOYKZqC0gJ0dGJp1PJrxZKewIgU5Dh8z5J9jxF1Wh+x3z6Y8K9+q1T2N5h7V3g4R8w0Qo=",
					},
				},
			},
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		expect(result.result).toBe(DaiaAgreementVerificationResult.FAILED);
		expect(result).toHaveProperty("failure");
		if (result.result === DaiaAgreementVerificationResult.FAILED) {
			expect(result.failure.type).toBe(DaiaAgreementVerificationFailureType.OTHER);
		}
	});

	it("should handle recursive agreement verification without infinite loops", async () => {
		// Setup: Create two agreements that reference each other (circular reference)
		const agreement1Content = {
			offerTypeIdentifier: "test-offer-1",
			naturalLanguageOfferContent: "First agreement",
			requirements: {
				req1: {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					referenceType: "test",
					pointer: {
						type: DaiaRemoteAgreementPointerType.TX_ID,
						txId: "tx2",
					},
				},
			},
		};

		const agreement2Content = {
			offerTypeIdentifier: "test-offer-2",
			naturalLanguageOfferContent: "Second agreement",
			requirements: {
				req1: {
					type: DaiaRequirementType.AGREEMENT_REFERENCE,
					referenceType: "test",
					pointer: {
						type: DaiaRemoteAgreementPointerType.TX_ID,
						txId: "tx1",
					},
				},
			},
		};

		const agreement1 = {
			offerContentSerialized: JSON.stringify(agreement1Content),
			proofs: {
				req1: {
					type: DaiaRequirementType.AGREEMENT_REFERENCE as const,
					reference: "tx2",
				},
			},
		};

		const agreement2 = {
			offerContentSerialized: JSON.stringify(agreement2Content),
			proofs: {
				req1: {
					type: DaiaRequirementType.AGREEMENT_REFERENCE as const,
					reference: "tx1",
				},
			},
		};

		// Setup mock transactions in the parser
		mockParser.setTransaction("tx1", {
			id: "tx1",
			data: {
				customData: JSON.stringify(agreement1),
				payments: {},
			},
			serializedTransaction: () => "mock-tx1",
			isFinalized: true,
		});

		mockParser.setTransaction("tx2", {
			id: "tx2",
			data: {
				customData: JSON.stringify(agreement2),
				payments: {},
			},
			serializedTransaction: () => "mock-tx2",
			isFinalized: true,
		});

		const request: DaiaAgreementVerifyRequest = {
			agreement: agreement1,
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		// Should not hang and should complete (even if it fails verification)
		expect(result).toBeDefined();
		expect(result).toHaveProperty("result");

		// The verification should handle circular references gracefully
		// by tracking already-verified transactions, preventing infinite recursion
		expect(result.result).toBeDefined();
	});

	it("should verify self-authenticated payment requirement successfully", async () => {
		// Setup: Create an agreement with self-authenticated payment
		const offerContent = {
			offerTypeIdentifier: "payment-offer",
			naturalLanguageOfferContent: "Payment test",
			requirements: {
				pay1: {
					type: DaiaRequirementType.PAYMENT,
					to: "recipient_address",
					amount: 5000,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
			},
		};

		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContentSerialized: JSON.stringify(offerContent),
				proofs: {
					pay1: {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					},
				},
			},
			transactionData: {
				payments: {
					recipient_address: 5000,
				},
			},
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		expect(result.result).toBe(DaiaAgreementVerificationResult.PASSED);
		if (result.result === DaiaAgreementVerificationResult.PASSED) {
			expect(result.totalAgreementPayments).toEqual({
				recipient_address: 5000,
			});
		}
	});

	it("should fail verification when payment amount doesn't match", async () => {
		// Setup: Create an agreement with mismatched payment amount
		const offerContent = {
			offerTypeIdentifier: "payment-offer",
			naturalLanguageOfferContent: "Payment test",
			requirements: {
				pay1: {
					type: DaiaRequirementType.PAYMENT,
					to: "recipient_address",
					amount: 5000,
					auth: {
						type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
					},
				},
			},
		};

		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContentSerialized: JSON.stringify(offerContent),
				proofs: {
					pay1: {
						type: DaiaRequirementType.PAYMENT,
						txId: "",
					},
				},
			},
			transactionData: {
				payments: {
					recipient_address: 3000, // Wrong amount!
				},
			},
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		expect(result.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (result.result === DaiaAgreementVerificationResult.FAILED) {
			expect(result.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
			);
		}
	});

	it("should fail signature verification when data is modified", async () => {
		// Create a real keypair and signature for testing
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();

		const offererNonce = "nonce123";
		const signeeNonce = "signee456";

		const offerContent = {
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "Test offer content",
			requirements: {
				req1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey.toString(),
					sign: null,
					offererNonce,
				},
			},
		};

		const offerContentSerialized = JSON.stringify(offerContent);

		// Create a valid signature
		const messageToSign = offererNonce + signeeNonce + offerContentSerialized;
		const messageBytes = Array.from(Buffer.from(messageToSign, "utf8"));
		const signature = privateKey.sign(messageBytes);
		const signatureDERRaw = signature.toDER("base64");
		const signatureDER =
			typeof signatureDERRaw === "string"
				? signatureDERRaw
				: Buffer.from(signatureDERRaw).toString("base64");

		// Modify the offer content after signing (tamper with data)
		const tamperedOfferContent = {
			...offerContent,
			naturalLanguageOfferContent: "MODIFIED content",
		};

		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContentSerialized: JSON.stringify(tamperedOfferContent), // Use tampered data
				proofs: {
					req1: {
						type: DaiaRequirementType.SIGN,
						signeeNonce,
						signature: signatureDER,
					},
				},
			},
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		expect(result.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (result.result === DaiaAgreementVerificationResult.FAILED) {
			expect(result.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
			);
		}
	});

	it("should fail signature verification when signature is modified", async () => {
		// Create a real keypair and signature for testing
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();

		const offererNonce = "nonce789";
		const signeeNonce = "signee012";

		const offerContent = {
			offerTypeIdentifier: "test-offer-2",
			naturalLanguageOfferContent: "Another test offer",
			requirements: {
				req1: {
					type: DaiaRequirementType.SIGN,
					pubKey: publicKey.toString(),
					sign: null,
					offererNonce,
				},
			},
		};

		const offerContentSerialized = JSON.stringify(offerContent);

		// Create a valid signature
		const messageToSign = offererNonce + signeeNonce + offerContentSerialized;
		const messageBytes = Array.from(Buffer.from(messageToSign, "utf8"));
		const signature = privateKey.sign(messageBytes);
		const signatureDERRaw = signature.toDER("base64");
		let signatureDER =
			typeof signatureDERRaw === "string"
				? signatureDERRaw
				: Buffer.from(signatureDERRaw).toString("base64");

		// Tamper with the signature by modifying a character
		signatureDER = signatureDER.slice(0, -3) + "XXX";

		const request: DaiaAgreementVerifyRequest = {
			agreement: {
				offerContentSerialized,
				proofs: {
					req1: {
						type: DaiaRequirementType.SIGN,
						signeeNonce,
						signature: signatureDER, // Use tampered signature
					},
				},
			},
		};

		const session = DaiaAgreementVerifySession.make(mockParser, request);
		const result = await session.run();

		expect(result.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (result.result === DaiaAgreementVerificationResult.FAILED) {
			expect(result.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH,
			);
		}
	});
});
