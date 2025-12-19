import { describe, it, expect } from "vitest";
import { PrivateKey, Signature } from "@daia/blockchain";
import { DefaultDaiaSignRequirementResolver } from "../resolvers/signResolverImpl";

describe("DefaultDaiaSignRequirementResolver", () => {
	it("should create a valid signature that can be verified", async () => {
		// Create a keypair for testing
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();
		const pubKeyString = publicKey.toString();

		// Create the resolver
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		// Test data
		const serializedOffer = JSON.stringify({
			offerTypeIdentifier: "test-offer",
			naturalLanguageOfferContent: "Test offer content",
			requirements: {
				req1: {
					type: "SIGN",
					pubKey: pubKeyString,
					sign: null,
					offererNonce: "offerer_nonce_123",
				},
			},
		});
		const offererNonce = "offerer_nonce_123";

		// Create signature proof
		const result = await resolver.createSignatureProof(serializedOffer, offererNonce, pubKeyString);

		// Verify result structure
		expect(result).not.toBeNull();
		expect(result!.nonce).toBeDefined();
		expect(result!.sign).toBeDefined();
		expect(typeof result!.nonce).toBe("string");
		expect(typeof result!.sign).toBe("string");
		expect(result!.nonce.length).toBe(64); // 32 bytes in hex = 64 characters

		// Verify the signature is valid
		const messageToVerify = offererNonce + result!.nonce + serializedOffer;
		const signature = Signature.fromDER(result!.sign, "base64");
		const isValid = publicKey.verify(messageToVerify, signature);

		expect(isValid).toBe(true);
	});

	it("should throw error when public key does not match private key", async () => {
		const privateKey = PrivateKey.fromRandom();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		// Use a different public key
		const differentPublicKey = PrivateKey.fromRandom().toPublicKey();

		await expect(
			resolver.createSignatureProof("serialized offer", "nonce", differentPublicKey.toString()),
		).rejects.toThrow("Public key mismatch");
	});

	it("should create different nonces for each call", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		const serializedOffer = "test offer";
		const offererNonce = "nonce123";
		const pubKeyString = publicKey.toString();

		const result1 = await resolver.createSignatureProof(serializedOffer, offererNonce, pubKeyString);

		const result2 = await resolver.createSignatureProof(serializedOffer, offererNonce, pubKeyString);

		// Nonces should be different
		expect(result1!.nonce).not.toBe(result2!.nonce);
		// But both should be valid
		expect(result1!.nonce.length).toBe(64);
		expect(result2!.nonce.length).toBe(64);
	});

	it("should create signatures compatible with verification session", async () => {
		// This test mimics the verification logic from session.ts
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();
		const pubKeyString = publicKey.toString();

		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		const offererNonce = "test_offerer_nonce";
		const offerContent = {
			offerTypeIdentifier: "test",
			naturalLanguageOfferContent: "content",
			requirements: {
				req1: {
					type: "SIGN",
					pubKey: pubKeyString,
					sign: null,
					offererNonce,
				},
			},
		};

		const serializedOffer = JSON.stringify(offerContent);

		// Create signature using resolver
		const proofResult = await resolver.createSignatureProof(
			serializedOffer,
			offererNonce,
			pubKeyString,
		);

		// Verify using the same logic as in session.ts verification
		const messageToVerify = offererNonce + proofResult!.nonce + serializedOffer;

		let verificationPassed = false;
		try {
			verificationPassed = publicKey.verify(
				messageToVerify,
				Signature.fromDER(proofResult!.sign, "base64"),
			);
		} catch {
			// Should not throw
			verificationPassed = false;
		}

		expect(verificationPassed).toBe(true);
	});
});
