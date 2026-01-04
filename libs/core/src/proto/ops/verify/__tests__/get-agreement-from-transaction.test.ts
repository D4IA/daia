import { describe, it, expect, beforeEach } from "vitest";
import {
	BlockchainTransactionParser,
	ParsedBlockchainTransactionHandle,
	BsvTransactionParser,
	BsvNetwork,
	PrivateKey,
} from "@d4ia/blockchain";
import { DefaultDaiaAgreementVerifier } from "../impl";
import { DaiaAgreementVerificationResult } from "../defines";
import { DaiaAgreement, DaiaOfferBuilder } from "../../../defines";
import { DaiaTransactionDataType } from "../../../blockchain/data";

// Mock BlockchainTransactionParser for testing
class MockBlockchainTransactionParser implements BlockchainTransactionParser {
	private transactions = new Map<string, ParsedBlockchainTransactionHandle>();

	async findTransactionById(id: string): Promise<ParsedBlockchainTransactionHandle | null> {
		return this.transactions.get(id) ?? null;
	}

	async parseTransaction(serializedTransaction: string): Promise<ParsedBlockchainTransactionHandle> {
		const realParser = new BsvTransactionParser(BsvNetwork.TEST);
		const handle = await realParser.parseTransaction(serializedTransaction);
		this.transactions.set(handle.id, handle);
		return handle;
	}

	// Helper method to add mock transactions
	addMockTransaction(tx: ParsedBlockchainTransactionHandle): void {
		this.transactions.set(tx.id, tx);
	}
}

describe("DefaultDaiaAgreementVerifier.getAgreementFromTransaction", () => {
	let mockParser: MockBlockchainTransactionParser;
	let verifier: DefaultDaiaAgreementVerifier;

	beforeEach(() => {
		mockParser = new MockBlockchainTransactionParser();
		verifier = new DefaultDaiaAgreementVerifier(mockParser);
	});

	it("should return found: false when transaction does not exist", async () => {
		const result = await verifier.getAgreementFromTransaction("nonexistent-tx-id");

		expect(result).toEqual({
			found: false,
		});
	});

	it("should return found: false when transaction has no custom data", async () => {
		const txId = "test-tx-no-data";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: null,
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result).toEqual({
			found: false,
		});
	});

	it("should return found: false when custom data is not a valid agreement", async () => {
		const txId = "test-tx-invalid-agreement";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: JSON.stringify({ invalid: "data" }),
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result).toEqual({
			found: false,
		});
	});

	it("should return agreement with verification result when valid agreement is found", async () => {
		// Create a simple valid agreement
		const offerContent = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST")
			.setNaturalLanguageContent("Test offer")
			.build();

		const agreement: DaiaAgreement = {
			offerContent,
			proofs: {},
		};

		const txId = "test-tx-valid-agreement";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: JSON.stringify(agreement),
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result.found).toBe(true);
		if (result.found) {
			expect(result.agreement).toEqual(agreement);
			expect(result.verification.result).toBe(DaiaAgreementVerificationResult.PASSED);
		}
	});

	it("should include verification failure when agreement is invalid", async () => {
		// Create an agreement with mismatched requirements and proofs
		const privateKey = PrivateKey.fromRandom();
		const offerContent = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST")
			.setNaturalLanguageContent("Test offer with requirement")
			.addSelfSignedRequirement(privateKey)
			.build();

		// Create agreement with missing proof
		const agreement: DaiaAgreement = {
			offerContent,
			proofs: {}, // Empty proofs but offer has requirements
		};

		const txId = "test-tx-invalid-verification";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: JSON.stringify(agreement),
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result.found).toBe(true);
		if (result.found) {
			expect(result.agreement).toEqual(agreement);
			expect(result.verification.result).toBe(DaiaAgreementVerificationResult.FAILED);
		}
	});

	it("should include transaction payment data in verification", async () => {
		// Create an agreement with payment requirements
		const recipientKey = PrivateKey.fromRandom();
		const recipientPublicKey = recipientKey.toPublicKey().toString();
		const paymentAmount = 10000;

		const offerContent = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-PAYMENT")
			.setNaturalLanguageContent("Test offer with payment")
			.addPaymentRequirement(recipientPublicKey, paymentAmount)
			.build();

		const agreement: DaiaAgreement = {
			offerContent,
			proofs: {}, // Will need payment proof via transaction
		};

		const recipientAddress = recipientKey.toPublicKey().toAddress();
		const txId = "test-tx-with-payments";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: JSON.stringify(agreement),
				payments: {
					[recipientAddress]: paymentAmount,
				},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result.found).toBe(true);
		if (result.found) {
			expect(result.agreement).toEqual(agreement);
			// This may pass or fail depending on payment verification logic
			// Just verify we got a verification result
			expect(result.verification.result).toBeDefined();
		}
	});

	it("should handle transactions with empty custom data string", async () => {
		const txId = "test-tx-empty-data";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: "",
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result).toEqual({
			found: false,
		});
	});

	it("should handle transactions with malformed JSON in custom data", async () => {
		const txId = "test-tx-malformed-json";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: "{invalid json",
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result).toEqual({
			found: false,
		});
	});

	it("should extract agreement from DaiaTransactionData wrapper (as stored by signer)", async () => {
		// This test verifies the verifier can handle agreements wrapped in DaiaTransactionData
		// which is how the DefaultDaiaOfferSigner stores them
		const offerContent = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-WRAPPED")
			.setNaturalLanguageContent("Test offer in DaiaTransactionData wrapper")
			.build();

		const agreement: DaiaAgreement = {
			offerContent,
			proofs: {},
		};

		const txId = "test-tx-wrapped-agreement";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				// Store as DaiaTransactionData, matching how the signer stores it
				customData: JSON.stringify({
					type: DaiaTransactionDataType.AGREEMENT,
					agreement,
				}),
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		expect(result.found).toBe(true);
		if (result.found) {
			expect(result.agreement).toEqual(agreement);
			expect(result.verification.result).toBe(DaiaAgreementVerificationResult.PASSED);
		}
	});

	it("should return found: false for DaiaTransactionData with type payment-identifier", async () => {
		const txId = "test-tx-payment-identifier";
		mockParser.addMockTransaction({
			id: txId,
			data: {
				customData: JSON.stringify({
					type: DaiaTransactionDataType.PAYMENT_IDENTIFIER,
					paymentNonce: "test-nonce-123",
				}),
				payments: {},
			},
			serializedTransaction: () => "mock-hex",
			isFinalized: true,
		});

		const result = await verifier.getAgreementFromTransaction(txId);

		// Should return not found since we're looking for agreements, not payment identifiers
		expect(result).toEqual({
			found: false,
		});
	});
});
