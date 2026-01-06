import { describe, it, expect } from "vitest";
import { PrivateKey, Transaction, P2PKH } from "@bsv/sdk";
import { BsvTransactionFactory } from "../factory";
import { BsvNetwork } from "../network";
import type { UtxoProvider, UTXO } from "../utxoProvider";
import type { BlockchainTransactionData } from "../../defines/transactionData";

/**
 * Mock UTXO provider that returns UTXOs with barely enough funds.
 */
class BarelyEnoughUtxoProvider implements UtxoProvider {
	constructor(private readonly satoshis: number) {}

	async getUtxos(): Promise<UTXO[]> {
		return [
			{
				txid: "0000000000000000000000000000000000000000000000000000000000000001",
				vout: 0,
				satoshis: this.satoshis,
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
			satoshis: this.satoshis,
		});
		return tx;
	}
}

describe("BSV Factory - Insufficient Funds Edge Cases", () => {
	it("should fail when user has only 1 satoshi more than payment amount (not enough for fee)", async () => {
		const privateKey = PrivateKey.fromRandom();
		const paymentAmount = 1000;
		const mockUtxoProvider = new BarelyEnoughUtxoProvider(paymentAmount + 1);
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.MAIN, 1, mockUtxoProvider);

		const data: BlockchainTransactionData = {
			customData: null,
			payments: {
				"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa": paymentAmount,
			},
		};

		try {
			const result = await factory.makeTransaction(data);
			console.log("Transaction succeeded unexpectedly:", result);
			throw new Error("Should have failed");
		} catch (error) {
			expect((error as Error).message).toMatch(/Insufficient funds/);
		}
	});

	it("should succeed when user has exactly fee + minimum change (2 satoshis) more", async () => {
		const privateKey = PrivateKey.fromRandom();
		const paymentAmount = 1000;
		const mockUtxoProvider = new BarelyEnoughUtxoProvider(paymentAmount + 2); // 1 for fee + 1 for change
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.MAIN, 1, mockUtxoProvider);

		const data: BlockchainTransactionData = {
			customData: null,
			payments: {
				"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa": paymentAmount,
			},
		};

		const result = await factory.makeTransaction(data);
		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
	});

	it("should succeed when user has enough funds to cover payment and fee", async () => {
		const privateKey = PrivateKey.fromRandom();
		const paymentAmount = 1000;
		// Provide enough funds to cover payment + fee (typically ~100-200 satoshis for a simple tx)
		const mockUtxoProvider = new BarelyEnoughUtxoProvider(paymentAmount + 500);
		const factory = new BsvTransactionFactory(privateKey, BsvNetwork.MAIN, 1, mockUtxoProvider);

		const data: BlockchainTransactionData = {
			customData: null,
			payments: {
				"1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa": paymentAmount,
			},
		};

		const result = await factory.makeTransaction(data);
		expect(result).toBeDefined();
		expect(result.id).toBeTruthy();
	});
});
