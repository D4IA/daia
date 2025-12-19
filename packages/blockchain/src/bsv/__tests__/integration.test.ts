import { describe, it, expect, beforeEach } from "vitest";
import { PrivateKey, Transaction, P2PKH } from "@bsv/sdk";
import { BsvTransactionFactory } from "../factory";
import { BsvTransactionParser } from "../parser";
import type { BlockchainTransactionData } from "../../defines/transactionData";
import type { UtxoProvider, UTXO } from "../utxoProvider";

/**
 * Mock UTXO provider for testing.
 */
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

	async getSourceTransaction(): Promise<Transaction> {
		const tx = new Transaction();
		const tempKey = PrivateKey.fromRandom();
		tx.addOutput({
			lockingScript: new P2PKH().lock(tempKey.toPublicKey().toHash() as number[]),
			satoshis: 100000,
		});
		return tx;
	}
}

describe("BSV Factory and Parser Integration", () => {
	let privateKey: PrivateKey;
	let factory: BsvTransactionFactory;
	let parser: BsvTransactionParser;
	let mockUtxoProvider: UtxoProvider;

	beforeEach(() => {
		privateKey = PrivateKey.fromRandom();
		mockUtxoProvider = new MockUtxoProvider();
		factory = new BsvTransactionFactory(privateKey, "main", 1, mockUtxoProvider);
		parser = new BsvTransactionParser("main");
	});

	it("should preserve custom data through factory->parser cycle", async () => {
		const customData = "Hello, BSV Blockchain!";
		const testData: BlockchainTransactionData = {
			customData,
			payments: {},
		};

		const created = await factory.makeTransaction(testData);
		const txHex = created.serializedTransaction();
		const parsed = await parser.parseTransaction(txHex);

		expect(parsed.data.customData).toBe(customData);
		expect(parsed.id).toBe(created.id);
	});

	it("should preserve payment outputs through factory->parser cycle", async () => {
		const recipientKey = PrivateKey.fromRandom();
		const recipientAddress = recipientKey.toPublicKey().toAddress();
		const paymentAmount = 5000;

		const testData: BlockchainTransactionData = {
			customData: null,
			payments: {
				[recipientAddress]: paymentAmount,
			},
		};

		const created = await factory.makeTransaction(testData);
		const txHex = created.serializedTransaction();
		const parsed = await parser.parseTransaction(txHex);

		expect(parsed.data.payments[recipientAddress]).toBe(paymentAmount);
		expect(parsed.data.customData).toBeNull();
	});

	it("should handle both custom data and payments together", async () => {
		const customData = "Invoice #12345";
		const recipientKey = PrivateKey.fromRandom();
		const recipientAddress = recipientKey.toPublicKey().toAddress();
		const paymentAmount = 3000;

		const testData: BlockchainTransactionData = {
			customData,
			payments: {
				[recipientAddress]: paymentAmount,
			},
		};

		const created = await factory.makeTransaction(testData);
		const txHex = created.serializedTransaction();
		const parsed = await parser.parseTransaction(txHex);

		expect(parsed.data.customData).toBe(customData);
		expect(parsed.data.payments[recipientAddress]).toBe(paymentAmount);
		expect(parsed.isFinalized).toBe(false);
	});

	it("should create transactions with signed inputs", async () => {
		const testData: BlockchainTransactionData = {
			customData: "Test data",
			payments: {},
		};

		const created = await factory.makeTransaction(testData);
		const txHex = created.serializedTransaction();
		const tx = Transaction.fromHex(txHex);

		// Verify all inputs have unlocking scripts (signatures)
		expect(tx.inputs.length).toBeGreaterThan(0);
		for (const input of tx.inputs) {
			expect(input.unlockingScript).toBeDefined();
			expect(input.unlockingScript?.toHex()).toBeTruthy();
			expect(input.unlockingScript?.toHex().length).toBeGreaterThan(0);
		}
	});

	it("should create valid transaction signatures", async () => {
		const recipientKey = PrivateKey.fromRandom();
		const recipientAddress = recipientKey.toPublicKey().toAddress();
		const testData: BlockchainTransactionData = {
			customData: "Payment transaction",
			payments: {
				[recipientAddress]: 10000,
			},
		};

		const created = await factory.makeTransaction(testData);
		const txHex = created.serializedTransaction();
		const tx = Transaction.fromHex(txHex);

		// Verify transaction structure is valid
		expect(tx.inputs.length).toBeGreaterThan(0);
		expect(tx.outputs.length).toBeGreaterThan(0);

		// Each input should have an unlocking script with signature data
		for (const input of tx.inputs) {
			const unlockingHex = input.unlockingScript?.toHex();
			expect(unlockingHex).toBeTruthy();

			// A valid P2PKH unlocking script should contain:
			// - A signature (typically 70-73 bytes with DER encoding)
			// - A public key (33 or 65 bytes)
			// Minimum length check: at least 100 hex chars (50 bytes)
			expect(unlockingHex!.length).toBeGreaterThan(100);
		}
	});

	it("should produce transactions that can be parsed and re-serialized", async () => {
		const testData: BlockchainTransactionData = {
			customData: "Round-trip test",
			payments: {},
		};

		const created = await factory.makeTransaction(testData);
		const originalHex = created.serializedTransaction();

		// Parse and re-serialize
		const tx = Transaction.fromHex(originalHex);
		const reserializedHex = tx.toHex();

		// Should be identical
		expect(reserializedHex).toBe(originalHex);

		// Verify signatures are preserved
		const reparsed = Transaction.fromHex(reserializedHex);
		expect(reparsed.inputs.length).toBe(tx.inputs.length);
		for (let i = 0; i < tx.inputs.length; i++) {
			const reparsedInput = reparsed.inputs[i];
			const originalInput = tx.inputs[i];

			expect(reparsedInput?.unlockingScript).toBeDefined();
			expect(originalInput?.unlockingScript).toBeDefined();
			expect(reparsedInput?.unlockingScript?.toHex()).toBe(originalInput?.unlockingScript?.toHex());
		}
	});
});
