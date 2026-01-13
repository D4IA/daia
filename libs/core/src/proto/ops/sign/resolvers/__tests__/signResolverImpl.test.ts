import { describe, it } from "vitest";
import { DefaultDaiaSignRequirementResolver } from "../signResolverImpl";
import { PrivateKey } from "@d4ia/blockchain-bridge";

describe("DefaultDaiaSignRequirementResolver", () => {
	it("should create resolver with private key", () => {
		const privateKey = PrivateKey.fromRandom();
		new DefaultDaiaSignRequirementResolver(privateKey);
	});

	it("should create signature proof with matching public key", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		resolver.createSignatureProof(JSON.stringify({ test: "offer" }), "remote-nonce-123", publicKey);
	});

	it("should create signature proof with serialized offer", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		const serializedOffer = JSON.stringify({
			offerTypeIdentifier: "TEST",
			naturalLanguageOfferContent: "Content",
			requirements: {},
		});

		resolver.createSignatureProof(serializedOffer, "nonce-abc", publicKey);
	});

	it("should create signature proof with complex offer", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		const complexOffer = JSON.stringify({
			offerTypeIdentifier: "COMPLEX",
			naturalLanguageOfferContent: "Complex offer with requirements",
			requirements: {
				"req-1": {
					type: "sign",
					pubKey: "some-key",
					offererNonce: "some-nonce",
				},
				"req-2": {
					type: "payment",
					to: "addr",
					amount: 1000,
					auth: { type: "self" },
				},
			},
		});

		resolver.createSignatureProof(complexOffer, "offerer-nonce", publicKey);
	});

	it("should create signature proof with empty offer", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		resolver.createSignatureProof("{}", "nonce", publicKey);
	});

	it("should create signature proof with long nonce", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		resolver.createSignatureProof(
			JSON.stringify({ test: "data" }),
			"very-long-nonce-" + "x".repeat(100),
			publicKey,
		);
	});

	it("should handle multiple signature creations", async () => {
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey().toString();
		const resolver = new DefaultDaiaSignRequirementResolver(privateKey);

		resolver.createSignatureProof("offer-1", "nonce-1", publicKey);
		resolver.createSignatureProof("offer-2", "nonce-2", publicKey);
		resolver.createSignatureProof("offer-3", "nonce-3", publicKey);
	});
});
