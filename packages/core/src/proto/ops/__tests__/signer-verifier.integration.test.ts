import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, BsvTransactionFactory, BsvTransactionParser } from "@daia/blockchain";
import type {
	BlockchainTransactionParser,
	ParsedBlockchainTransactionHandle,
	UtxoProvider,
	UTXO,
} from "@daia/blockchain";

// Import from @bsv/sdk through blockchain's peer dependency
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Transaction, P2PKH } = require("@bsv/sdk");
import {
	DefaultDaiaOfferSigner,
	DaiaOfferSignRequest,
	DaiaOfferSignResponseType,
	DefaultDaiaSignRequirementResolver,
	DefaultDaiaPaymentRequirementResolver,
} from "../sign";
import {
	DefaultDaiaAgreementVerifier,
	DaiaAgreementVerifyRequest,
	DaiaAgreementVerificationResult,
	DaiaAgreementVerificationFailureType,
} from "../verify";
import {
	DaiaRequirementType,
	DaiaPaymentRequirementAuthType,
	DaiaInnerOfferContent,
	DaiaTransferOfferContent,
	DaiaOfferBuilder,
	DaiaAgreement,
} from "../../defines";

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

// Mock BlockchainTransactionParser - stores transactions in-memory without network access
class MockBlockchainTransactionParser implements BlockchainTransactionParser {
	private transactions = new Map<string, ParsedBlockchainTransactionHandle>();
	private readonly realParser: BsvTransactionParser;

	constructor(network: "main" | "test" | "stn") {
		this.realParser = new BsvTransactionParser(network);
	}

	async findTransactionById(id: string): Promise<ParsedBlockchainTransactionHandle | null> {
		return this.transactions.get(id) ?? null;
	}

	async parseTransaction(serializedTransaction: string): Promise<ParsedBlockchainTransactionHandle> {
		// Use real parser to parse the transaction
		const handle = await this.realParser.parseTransaction(serializedTransaction);
		// Store it in-memory for later retrieval
		this.transactions.set(handle.id, handle);
		return handle;
	}

	async storeTransaction(handle: ParsedBlockchainTransactionHandle): Promise<void> {
		this.transactions.set(handle.id, handle);
	}
}

describe("Signer-Verifier Integration Test", () => {
	let offererPrivateKey: PrivateKey;
	let signeePrivateKey: PrivateKey;
	let mockParser: MockBlockchainTransactionParser;
	let factory: BsvTransactionFactory;
	let signer: DefaultDaiaOfferSigner;
	let verifier: DefaultDaiaAgreementVerifier;

	beforeEach(() => {
		// Generate real keys
		offererPrivateKey = PrivateKey.fromRandom();
		signeePrivateKey = PrivateKey.fromRandom();

		// Create mock storage (parser) and mock UTXO provider
		const network = "test";
		mockParser = new MockBlockchainTransactionParser(network);
		const mockUtxoProvider = new MockUtxoProvider();

		// Create REAL transaction factory with mocked UTXO provider
		factory = new BsvTransactionFactory(signeePrivateKey, network, 1, mockUtxoProvider);

		// Create resolvers with real factory
		const signResolver = new DefaultDaiaSignRequirementResolver(signeePrivateKey);
		const paymentResolver = new DefaultDaiaPaymentRequirementResolver(factory);

		// Create signer with real factory
		signer = new DefaultDaiaOfferSigner({
			transactionFactory: factory,
			signResolver,
			paymentResolver,
		});

		// Create verifier with mock storage
		verifier = new DefaultDaiaAgreementVerifier(mockParser);
	});

	it("should sign an offer and verify the agreement successfully", async () => {
		// Step 1: Create an offer with sign and payment requirements
		const signeePublicKey = signeePrivateKey.toPublicKey().toString();
		const paymentAddress = offererPrivateKey.toPublicKey().toAddress().toString();

		const innerOffer: DaiaInnerOfferContent = {
			offerTypeIdentifier: "TEST-OFFER",
			naturalLanguageOfferContent: "Test offer with sign and payment requirements",
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "test-nonce-123",
					pubKey: signeePublicKey,
				},
				"payment-req-1": {
					type: DaiaRequirementType.PAYMENT,
					to: paymentAddress,
					amount: 1000,
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

		// Step 2: Sign the offer
		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await signer.signOffer(signRequest);

		// Assert signing succeeded
		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 3: Parse and store the transaction (without publishing to network)
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 4: Verify the agreement
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement,
			transactionData: {
				payments: transaction.data.payments,
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		// Assert verification passed
		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);

		if (verifyResponse.result === DaiaAgreementVerificationResult.PASSED) {
			// Verify total payments match
			expect(verifyResponse.totalAgreementPayments).toBeDefined();
			expect(verifyResponse.totalAgreementPayments).not.toBeNull();
			expect(verifyResponse.totalAgreementPayments![paymentAddress]).toBe(1000);
		}
	});

	it("should create an offer with self-signed and signee requirements using DaiaOfferBuilder", async () => {
		// Step 1: Create two parties - offerer and signee
		// Offerer will self-sign, signee will sign later
		// Note: Using new keys separate from beforeEach to keep test independent
		const testOffererPrivateKey = PrivateKey.fromRandom();
		const testSigneePrivateKey = PrivateKey.fromRandom();

		// Both know each other's public keys
		const testSigneePublicKey = testSigneePrivateKey.toPublicKey().toString();

		// Step 2: Offerer creates the offer with builder
		const offer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-BUILDER-OFFER")
			.setNaturalLanguageContent("Test offer with self-signed and signee requirements")
			.addSelfSignedRequirement(testOffererPrivateKey) // Offerer self-signs
			.addSignRequirement(testSigneePublicKey) // Signee needs to sign
			.build();

		// Parse the offer to get requirement IDs
		const parsedInnerOffer = JSON.parse(offer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);

		// Verify the offer has the self-signature
		expect(offer.signatures).toBeDefined();
		expect(Object.keys(offer.signatures).length).toBe(1);
		
		// Find the requirement ID that has a signature (the self-signed one)
		const selfSignedRequirementId = requirementIds.find(id => offer.signatures[id]);
		expect(selfSignedRequirementId).toBeDefined();
		expect(offer.signatures[selfSignedRequirementId!]?.signature).toBeTruthy();

		// Step 3: Create signer for the signee
		const mockUtxoProvider = new MockUtxoProvider();
		const testSigneeFactory = new BsvTransactionFactory(testSigneePrivateKey, "test", 1, mockUtxoProvider);
		const testSignResolver = new DefaultDaiaSignRequirementResolver(testSigneePrivateKey);
		const testPaymentResolver = new DefaultDaiaPaymentRequirementResolver(testSigneeFactory);

		const testSigneeSigner = new DefaultDaiaOfferSigner({
			transactionFactory: testSigneeFactory,
			signResolver: testSignResolver,
			paymentResolver: testPaymentResolver,
		});

		// Step 4: Signee signs the offer
		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await testSigneeSigner.signOffer(signRequest);

		// Assert signing succeeded
		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 5: Parse and store the transaction (without publishing to network)
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 6: Verify the agreement
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		// Assert verification passed
		if (verifyResponse.result !== DaiaAgreementVerificationResult.PASSED) {
			console.error("Verification failed:", verifyResponse);
		}
		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.PASSED);

		// Verify both signatures are in the proofs
		expect(agreement.proofs).toBeDefined();
		const proofKeys = Object.keys(agreement.proofs);
		expect(proofKeys.length).toBeGreaterThanOrEqual(2); // At least 2 sign requirements

		// Count sign requirements
		let signCount = 0;
		for (const proofKey of proofKeys) {
			const proof = agreement.proofs[proofKey];
			if (proof && proof.type === DaiaRequirementType.SIGN) {
				signCount++;
			}
		}
		expect(signCount).toBe(2); // Both offerer and signee signed
	});

	it("should fail verification when offer data is tampered with after signing", async () => {
		// Step 1: Create an offer with a sign requirement
		const signeePublicKey = signeePrivateKey.toPublicKey().toString();

		const innerOffer: DaiaInnerOfferContent = {
			offerTypeIdentifier: "TEST-TAMPER",
			naturalLanguageOfferContent: "Original offer content",
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "test-nonce-tamper",
					pubKey: signeePublicKey,
				},
			},
		};

		const offer: DaiaTransferOfferContent = {
			inner: JSON.stringify(innerOffer),
			signatures: {},
		};

		// Step 2: Sign the offer
		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 3: Tamper with the offer data by modifying the inner content
		const tamperedInnerOffer = { ...innerOffer, naturalLanguageOfferContent: "Tampered offer content" };
		const tamperedAgreement: DaiaAgreement = {
			...agreement,
			offerContent: {
				...agreement.offerContent,
				inner: JSON.stringify(tamperedInnerOffer),
			},
		};

		// Step 4: Parse and store the transaction
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 5: Attempt to verify the tampered agreement
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement: tamperedAgreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		// Assert verification FAILED due to signature mismatch
		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.FAILED) {
			expect(verifyResponse.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH
			);
		}
	});

	it("should fail verification when offerer nonce is tampered with", async () => {
		// Step 1: Create and sign an offer
		const signeePublicKey = signeePrivateKey.toPublicKey().toString();

		const innerOffer: DaiaInnerOfferContent = {
			offerTypeIdentifier: "TEST-NONCE-TAMPER",
			naturalLanguageOfferContent: "Test offer",
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "original-nonce-123",
					pubKey: signeePublicKey,
				},
			},
		};

		const offer: DaiaTransferOfferContent = {
			inner: JSON.stringify(innerOffer),
			signatures: {},
		};

		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 2: Tamper with the offerer nonce
		const tamperedInnerOffer: DaiaInnerOfferContent = {
			...innerOffer,
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "tampered-nonce-456",
					pubKey: signeePublicKey,
				},
			},
		};

		const tamperedAgreement: DaiaAgreement = {
			...agreement,
			offerContent: {
				...agreement.offerContent,
				inner: JSON.stringify(tamperedInnerOffer),
			},
		};

		// Step 3: Parse and store the transaction
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 4: Verify - should fail
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement: tamperedAgreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.FAILED) {
			expect(verifyResponse.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH
			);
		}
	});

	it("should fail verification when signee nonce is tampered with", async () => {
		// Step 1: Create and sign an offer
		const signeePublicKey = signeePrivateKey.toPublicKey().toString();

		const innerOffer: DaiaInnerOfferContent = {
			offerTypeIdentifier: "TEST-SIGNEE-NONCE-TAMPER",
			naturalLanguageOfferContent: "Test offer",
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "test-nonce-789",
					pubKey: signeePublicKey,
				},
			},
		};

		const offer: DaiaTransferOfferContent = {
			inner: JSON.stringify(innerOffer),
			signatures: {},
		};

		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 2: Tamper with the signee nonce in the proof
		const originalSignProof = agreement.proofs["sign-req-1"];
		if (!originalSignProof || originalSignProof.type !== DaiaRequirementType.SIGN) {
			throw new Error("Expected sign proof");
		}

		const tamperedAgreement: DaiaAgreement = {
			...agreement,
			proofs: {
				"sign-req-1": {
					...originalSignProof,
					signeeNonce: "tampered-signee-nonce",
				},
			},
		};

		// Step 3: Parse and store the transaction
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 4: Verify - should fail
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement: tamperedAgreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.FAILED) {
			expect(verifyResponse.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH
			);
		}
	});

	it("should fail verification when signature is modified", async () => {
		// Step 1: Create and sign an offer
		const signeePublicKey = signeePrivateKey.toPublicKey().toString();

		const innerOffer: DaiaInnerOfferContent = {
			offerTypeIdentifier: "TEST-SIGNATURE-TAMPER",
			naturalLanguageOfferContent: "Test offer",
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "test-nonce-signature",
					pubKey: signeePublicKey,
				},
			},
		};

		const offer: DaiaTransferOfferContent = {
			inner: JSON.stringify(innerOffer),
			signatures: {},
		};

		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 2: Tamper with the signature
		const originalSignProof = agreement.proofs["sign-req-1"];
		if (!originalSignProof || originalSignProof.type !== DaiaRequirementType.SIGN) {
			throw new Error("Expected sign proof");
		}

		// Modify a few characters in the signature
		const originalSignature = originalSignProof.signature;
		const tamperedSignature = originalSignature.slice(0, -10) + "TAMPERED12";

		const tamperedAgreement: DaiaAgreement = {
			...agreement,
			proofs: {
				"sign-req-1": {
					...originalSignProof,
					signature: tamperedSignature,
				},
			},
		};

		// Step 3: Parse and store the transaction
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 4: Verify - should fail
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement: tamperedAgreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.FAILED) {
			expect(verifyResponse.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH
			);
		}
	});

	it("should fail verification when public key requirement is changed", async () => {
		// Step 1: Create and sign an offer
		const signeePublicKey = signeePrivateKey.toPublicKey().toString();
		const differentPrivateKey = PrivateKey.fromRandom();
		const differentPublicKey = differentPrivateKey.toPublicKey().toString();

		const innerOffer: DaiaInnerOfferContent = {
			offerTypeIdentifier: "TEST-PUBKEY-TAMPER",
			naturalLanguageOfferContent: "Test offer",
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "test-nonce-pubkey",
					pubKey: signeePublicKey,
				},
			},
		};

		const offer: DaiaTransferOfferContent = {
			inner: JSON.stringify(innerOffer),
			signatures: {},
		};

		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 2: Change the public key to a different one
		const tamperedInnerOffer: DaiaInnerOfferContent = {
			...innerOffer,
			requirements: {
				"sign-req-1": {
					type: DaiaRequirementType.SIGN,
					offererNonce: "test-nonce-pubkey",
					pubKey: differentPublicKey, // Different public key!
				},
			},
		};

		const tamperedAgreement: DaiaAgreement = {
			...agreement,
			offerContent: {
				...agreement.offerContent,
				inner: JSON.stringify(tamperedInnerOffer),
			},
		};

		// Step 3: Parse and store the transaction
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 4: Verify - should fail because signature was made with different key
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement: tamperedAgreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.FAILED) {
			expect(verifyResponse.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH
			);
		}
	});

	it("should fail verification when self-signed signature is tampered", async () => {
		// Step 1: Create an offer with self-signed requirement using builder
		const testPrivateKey = PrivateKey.fromRandom();

		const offer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-SELF-SIGNED-TAMPER")
			.setNaturalLanguageContent("Test self-signed offer")
			.addSelfSignedRequirement(testPrivateKey)
			.build();

		// Parse to get requirement ID
		const parsedInnerOffer = JSON.parse(offer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);
		const selfSignedReqId = requirementIds[0];
		
		if (!selfSignedReqId) {
			throw new Error("Expected at least one requirement");
		}

		// Step 2: Create a mock signer to process the self-signed offer
		const mockUtxoProvider = new MockUtxoProvider();
		const testFactory = new BsvTransactionFactory(testPrivateKey, "test", 1, mockUtxoProvider);

		const testSigner = new DefaultDaiaOfferSigner({
			transactionFactory: testFactory,
		});

		const signRequest: DaiaOfferSignRequest = { offer };
		const signResponse = await testSigner.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);

		if (signResponse.type !== DaiaOfferSignResponseType.SUCCESS) {
			throw new Error("Signing failed");
		}

		const { agreement, transaction } = signResponse;

		// Step 3: Tamper with the signature in the proof
		const originalProof = agreement.proofs[selfSignedReqId];
		if (!originalProof || originalProof.type !== DaiaRequirementType.SIGN) {
			throw new Error("Expected sign proof");
		}

		const tamperedSignature = originalProof.signature.slice(0, -10) + "TAMPERED99";

		const tamperedAgreement: DaiaAgreement = {
			...agreement,
			proofs: {
				...agreement.proofs,
				[selfSignedReqId]: {
					...originalProof,
					signature: tamperedSignature,
				},
			},
		};

		// Step 4: Parse and store the transaction
		const parsedTransaction = await mockParser.parseTransaction(transaction.serializedTransaction());
		await mockParser.storeTransaction(parsedTransaction);

		// Step 5: Verify - should fail
		const verifyRequest: DaiaAgreementVerifyRequest = {
			agreement: tamperedAgreement,
			transactionData: {
				payments: {},
			},
		};

		const verifyResponse = await verifier.verifyAgreement(verifyRequest);

		expect(verifyResponse.result).toBe(DaiaAgreementVerificationResult.FAILED);
		if (verifyResponse.result === DaiaAgreementVerificationResult.FAILED) {
			expect(verifyResponse.failure.type).toBe(
				DaiaAgreementVerificationFailureType.REQUIREMENTS_TO_PROOFS_MISMATCH
			);
		}
	});
});
