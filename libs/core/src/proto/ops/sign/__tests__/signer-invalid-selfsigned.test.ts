import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, BsvTransactionFactory, BsvNetwork } from "@d4ia/blockchain";
import type { UtxoProvider, UTXO } from "@d4ia/blockchain";

// Import from @bsv/sdk through blockchain's peer dependency
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Transaction, P2PKH } = require("@bsv/sdk");
import { DefaultDaiaOfferSigner } from "../signerImpl";
import { DaiaOfferSignRequest, DaiaOfferSignResponseType } from "../defines";
import {
	DaiaRequirementType,
	DaiaInnerOfferContent,
	DaiaTransferOfferContent,
	DaiaOfferBuilder,
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

describe("DefaultDaiaOfferSigner - Invalid Self-Signed Offers", () => {
	let offererPrivateKey: PrivateKey;
	let signeePrivateKey: PrivateKey;
	let signer: DefaultDaiaOfferSigner;

	beforeEach(() => {
		offererPrivateKey = PrivateKey.fromRandom();
		signeePrivateKey = PrivateKey.fromRandom();

		const mockUtxoProvider = new MockUtxoProvider();
		const factory = new BsvTransactionFactory(signeePrivateKey, BsvNetwork.TEST, 1, mockUtxoProvider);

		signer = new DefaultDaiaOfferSigner({
			transactionFactory: factory,
		});
	});

	it("should fail when self-signed signature is invalid", async () => {
		// Step 1: Create a proper self-signed offer
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-INVALID-SELF-SIGN")
			.setNaturalLanguageContent("Test offer with invalid self-signature")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		// Step 2: Tamper with the signature to make it invalid
		const parsedInnerOffer = JSON.parse(validOffer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);
		const selfSignedReqId = requirementIds[0];

		if (!selfSignedReqId || !validOffer.signatures[selfSignedReqId]) {
			throw new Error("Expected a self-signed requirement");
		}

		const tamperedOffer: DaiaTransferOfferContent = {
			...validOffer,
			signatures: {
				[selfSignedReqId]: {
					signature: "INVALID_SIGNATURE_DATA_12345",
				},
			},
		};

		// Step 3: Try to sign with the tampered offer - should fail
		const signRequest: DaiaOfferSignRequest = { offer: tamperedOffer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.REQUIREMENT_FAILURE);
		if (signResponse.type === DaiaOfferSignResponseType.REQUIREMENT_FAILURE) {
			expect(signResponse.failedRequirementId).toBe(selfSignedReqId);
		}
	});

	it("should fail when self-signed offer content is modified after signing", async () => {
		// Step 1: Create a valid self-signed offer
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-MODIFIED-CONTENT")
			.setNaturalLanguageContent("Original content")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		const parsedInnerOffer = JSON.parse(validOffer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);
		const selfSignedReqId = requirementIds[0];

		if (!selfSignedReqId) {
			throw new Error("Expected a self-signed requirement");
		}

		// Step 2: Modify the offer content but keep the original signature
		const modifiedInnerOffer: DaiaInnerOfferContent = {
			...parsedInnerOffer,
			naturalLanguageOfferContent: "Modified content after signing",
		};

		const tamperedOffer: DaiaTransferOfferContent = {
			inner: JSON.stringify(modifiedInnerOffer),
			signatures: validOffer.signatures, // Keep original signatures
		};

		// Step 3: Try to sign with the modified offer - should fail
		const signRequest: DaiaOfferSignRequest = { offer: tamperedOffer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.REQUIREMENT_FAILURE);
		if (signResponse.type === DaiaOfferSignResponseType.REQUIREMENT_FAILURE) {
			expect(signResponse.failedRequirementId).toBe(selfSignedReqId);
		}
	});

	it("should fail when self-signed requirement pubKey is changed", async () => {
		// Step 1: Create a valid self-signed offer
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-CHANGED-PUBKEY")
			.setNaturalLanguageContent("Test offer")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		const parsedInnerOffer = JSON.parse(validOffer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);
		const selfSignedReqId = requirementIds[0];

		if (!selfSignedReqId) {
			throw new Error("Expected a self-signed requirement");
		}

		// Step 2: Change the public key in the requirement
		const differentPrivateKey = PrivateKey.fromRandom();
		const differentPublicKey = differentPrivateKey.toPublicKey().toString();

		const requirement = parsedInnerOffer.requirements[selfSignedReqId];
		if (!requirement || requirement.type !== DaiaRequirementType.SIGN) {
			throw new Error("Expected a SIGN requirement");
		}

		const modifiedInnerOffer: DaiaInnerOfferContent = {
			...parsedInnerOffer,
			requirements: {
				[selfSignedReqId]: {
					...requirement,
					pubKey: differentPublicKey,
				},
			},
		};

		const tamperedOffer: DaiaTransferOfferContent = {
			inner: JSON.stringify(modifiedInnerOffer),
			signatures: validOffer.signatures, // Keep original signatures
		};

		// Step 3: Try to sign with the modified offer - should fail
		const signRequest: DaiaOfferSignRequest = { offer: tamperedOffer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.REQUIREMENT_FAILURE);
		if (signResponse.type === DaiaOfferSignResponseType.REQUIREMENT_FAILURE) {
			expect(signResponse.failedRequirementId).toBe(selfSignedReqId);
		}
	});

	it("should fail when self-signed nonce is changed", async () => {
		// Step 1: Create a valid self-signed offer
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-CHANGED-NONCE")
			.setNaturalLanguageContent("Test offer")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		const parsedInnerOffer = JSON.parse(validOffer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);
		const selfSignedReqId = requirementIds[0];

		if (!selfSignedReqId) {
			throw new Error("Expected a self-signed requirement");
		}

		// Step 2: Change the nonce in the requirement
		const requirement = parsedInnerOffer.requirements[selfSignedReqId];
		if (!requirement || requirement.type !== DaiaRequirementType.SIGN) {
			throw new Error("Expected a SIGN requirement");
		}

		const modifiedInnerOffer: DaiaInnerOfferContent = {
			...parsedInnerOffer,
			requirements: {
				[selfSignedReqId]: {
					...requirement,
					offererNonce: "TAMPERED_NONCE_12345",
				},
			},
		};

		const tamperedOffer: DaiaTransferOfferContent = {
			inner: JSON.stringify(modifiedInnerOffer),
			signatures: validOffer.signatures, // Keep original signatures
		};

		// Step 3: Try to sign with the modified offer - should fail
		const signRequest: DaiaOfferSignRequest = { offer: tamperedOffer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.REQUIREMENT_FAILURE);
		if (signResponse.type === DaiaOfferSignResponseType.REQUIREMENT_FAILURE) {
			expect(signResponse.failedRequirementId).toBe(selfSignedReqId);
		}
	});

	it("should succeed with a valid self-signed offer (control test)", async () => {
		// This is a control test to ensure valid self-signed offers still work
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-VALID-SELF-SIGN")
			.setNaturalLanguageContent("Valid test offer")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		const signRequest: DaiaOfferSignRequest = { offer: validOffer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.SUCCESS);
	});

	it("should validate self-signed offers created with builder when summarizing", async () => {
		// Create a valid self-signed offer using the builder
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-BUILDER-SUMMARIZE")
			.setNaturalLanguageContent("Test builder offer for summarize")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		// Summarize the offer - should work fine with valid signature
		const summary = await signer.summarizeOffer(validOffer);

		expect(summary.content).toBeDefined();
		expect(summary.content.offerTypeIdentifier).toBe("TEST-BUILDER-SUMMARIZE");
		expect(summary.content.naturalLanguageOfferContent).toBe("Test builder offer for summarize");

		// Verify self-signed data is present
		const requirementIds = Object.keys(summary.content.requirements);
		expect(requirementIds.length).toBe(1);
		const selfSignedReqId = requirementIds[0];
		expect(selfSignedReqId).toBeDefined();
		expect(summary.selfSignedData[selfSignedReqId!]).toBeDefined();
		expect(summary.selfSignedData[selfSignedReqId!]?.signature).toBeTruthy();
	});

	it("should fail to sign offer with tampered self-signature created by builder", async () => {
		// Create a valid self-signed offer using the builder
		const validOffer = DaiaOfferBuilder.new()
			.setOfferTypeIdentifier("TEST-BUILDER-TAMPERED")
			.setNaturalLanguageContent("Test builder offer")
			.addSelfSignedRequirement(offererPrivateKey)
			.build();

		// Tamper with the signature
		const parsedInnerOffer = JSON.parse(validOffer.inner) as DaiaInnerOfferContent;
		const requirementIds = Object.keys(parsedInnerOffer.requirements);
		const selfSignedReqId = requirementIds[0];

		if (!selfSignedReqId || !validOffer.signatures[selfSignedReqId]) {
			throw new Error("Expected a self-signed requirement");
		}

		const tamperedOffer: DaiaTransferOfferContent = {
			...validOffer,
			signatures: {
				[selfSignedReqId]: {
					signature: validOffer.signatures[selfSignedReqId].signature.slice(0, -5) + "XXXXX",
				},
			},
		};

		// Try to sign - should fail validation
		const signRequest: DaiaOfferSignRequest = { offer: tamperedOffer };
		const signResponse = await signer.signOffer(signRequest);

		expect(signResponse.type).toBe(DaiaOfferSignResponseType.REQUIREMENT_FAILURE);
		if (signResponse.type === DaiaOfferSignResponseType.REQUIREMENT_FAILURE) {
			expect(signResponse.failedRequirementId).toBe(selfSignedReqId);
		}
	});
});
