import { describe, it } from "vitest";
import { DefaultDaiaPaymentRequirementResolver } from "../paymentResolverImpl";
import { BsvTransactionFactory, PrivateKey, BsvNetwork } from "@d4ia/blockchain-bridge";
import { DaiaPaymentRequirementAuthType } from "../../../../defines";
import { Transaction, P2PKH } from "@bsv/sdk";

class MockUtxoProvider {
	async getUtxos() {
		return [
			{
				txid: "0000000000000000000000000000000000000000000000000000000000000001",
				vout: 0,
				satoshis: 100000,
				scriptPubKey: "76a914" + "00".repeat(20) + "88ac",
			},
		];
	}

	async getUtxosWithTotal() {
		return this.getUtxos();
	}

	async getSourceTransaction() {
		const tx = new Transaction();
		const tempKey = PrivateKey.fromRandom();
		tx.addOutput({
			lockingScript: new P2PKH().lock(tempKey.toPublicKey().toHash()),
			satoshis: 100000,
		});
		return tx;
	}
}

describe("DefaultDaiaPaymentRequirementResolver", () => {
	it("should create resolver with transaction factory", () => {
		const privateKey = PrivateKey.fromRandom();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, new MockUtxoProvider());
		new DefaultDaiaPaymentRequirementResolver(factory);
	});

	it("should handle self-authenticated payment requirement", async () => {
		const privateKey = PrivateKey.fromRandom();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, new MockUtxoProvider());
		const resolver = new DefaultDaiaPaymentRequirementResolver(factory);

		resolver.createPaymentProof({
			type: "payment",
			to: PrivateKey.fromRandom().toPublicKey().toAddress().toString(),
			amount: 1000,
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});

	it("should handle remote payment requirement", async () => {
		const privateKey = PrivateKey.fromRandom();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, new MockUtxoProvider());
		const resolver = new DefaultDaiaPaymentRequirementResolver(factory);

		resolver.createPaymentProof({
			type: "payment",
			to: PrivateKey.fromRandom().toPublicKey().toAddress().toString(),
			amount: 2000,
			auth: {
				type: DaiaPaymentRequirementAuthType.REMOTE,
				paymentNonce: "test-nonce-123",
			},
		});
	});

	it("should handle self-authenticated payment with large amount", async () => {
		const privateKey = PrivateKey.fromRandom();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, new MockUtxoProvider());
		const resolver = new DefaultDaiaPaymentRequirementResolver(factory);

		resolver.createPaymentProof({
			type: "payment",
			to: PrivateKey.fromRandom().toPublicKey().toAddress().toString(),
			amount: 999999,
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});

	it("should handle remote payment with custom nonce", async () => {
		const privateKey = PrivateKey.fromRandom();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, new MockUtxoProvider());
		const resolver = new DefaultDaiaPaymentRequirementResolver(factory);

		resolver.createPaymentProof({
			type: "payment",
			to: PrivateKey.fromRandom().toPublicKey().toAddress().toString(),
			amount: 5000,
			auth: {
				type: DaiaPaymentRequirementAuthType.REMOTE,
				paymentNonce: "custom-nonce-xyz",
			},
		});
	});

	it("should handle payment with related transaction", async () => {
		const privateKey = PrivateKey.fromRandom();
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, new MockUtxoProvider());
		const resolver = new DefaultDaiaPaymentRequirementResolver(factory);

		resolver.createPaymentProof({
			type: "payment",
			to: PrivateKey.fromRandom().toPublicKey().toAddress().toString(),
			amount: 1500,
			relatedTx: "entry-tx-id",
			auth: {
				type: DaiaPaymentRequirementAuthType.SELF_AUTHENTICATED,
			},
		});
	});
});
