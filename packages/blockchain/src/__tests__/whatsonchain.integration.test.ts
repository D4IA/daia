import { describe, it, expect, beforeAll } from "vitest";
import { PrivateKey } from "@bsv/sdk";
import { BsvTransactionFactory } from "../bsv/factory";
import { BsvTransactionParser } from "../bsv/parser";
import { WhatsOnChainUtxoProvider } from "../bsv/utxoProvider";
import type { BlockchainTransactionData } from "../defines/transactionData";

const hasTestEnv = () => {
	return !!(
		process.env["TEST_PRIVATE_KEY"] &&
		process.env["TEST_PUBLIC_KEY"] &&
		process.env["TEST_PUBLIC_ADDRESS"]
	);
};

describe.skipIf(!hasTestEnv())("WhatsOnChain API Integration", () => {
	let privateKey: PrivateKey;
	let factory: BsvTransactionFactory;
	let parser: BsvTransactionParser;
	let utxoProvider: WhatsOnChainUtxoProvider;

	beforeAll(() => {
		if (!hasTestEnv()) return;

		// If no funds in env address, generate a random one for API testing
		privateKey = process.env["TEST_PRIVATE_KEY"]
			? PrivateKey.fromWif(process.env["TEST_PRIVATE_KEY"])
			: PrivateKey.fromRandom();

		utxoProvider = new WhatsOnChainUtxoProvider(privateKey, "test");
		factory = new BsvTransactionFactory(privateKey, "test", 1, utxoProvider);
		parser = new BsvTransactionParser("test");
	});

	it("should fetch UTXOs from WhatsOnChain API (or return empty for unfunded address)", async () => {
		try {
			const utxos = await utxoProvider.getUtxos();

			expect(Array.isArray(utxos)).toBe(true);
			expect(utxos.length).toBeGreaterThanOrEqual(0);

			if (utxos.length > 0) {
				const utxo = utxos[0]!;
				expect(utxo).toHaveProperty("txid");
				expect(utxo).toHaveProperty("vout");
				expect(utxo).toHaveProperty("satoshis");
				expect(utxo).toHaveProperty("scriptPubKey");

				expect(typeof utxo.txid).toBe("string");
				expect(utxo.txid.length).toBe(64);
				expect(typeof utxo.vout).toBe("number");
				expect(typeof utxo.satoshis).toBe("number");
				expect(utxo.satoshis).toBeGreaterThan(0);
			}
		} catch (error) {
			// 400 Bad Request means address has no UTXOs - this is valid API behavior
			if (error instanceof Error && error.message.includes("400 Bad Request")) {
				expect(error.message).toContain("Failed to fetch UTXOs");
			} else {
				throw error;
			}
		}
	});

	it("should handle UTXO selection (or fail gracefully for unfunded address)", async () => {
		const requiredAmount = 10000;

		try {
			const utxos = await utxoProvider.getUtxosWithTotal(requiredAmount);

			expect(Array.isArray(utxos)).toBe(true);
			expect(utxos.length).toBeGreaterThan(0);

			const total = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);
			expect(total).toBeGreaterThanOrEqual(requiredAmount);
		} catch (error) {
			// Expected errors for unfunded addresses
			if (error instanceof Error) {
				const validErrors = ["Insufficient funds", "400 Bad Request", "Failed to fetch UTXOs"];
				expect(validErrors.some((msg) => error.message.includes(msg))).toBe(true);
			} else {
				throw error;
			}
		}
	});

	it("should fetch source transaction from WhatsOnChain API (if UTXOs exist)", async () => {
		try {
			const utxos = await utxoProvider.getUtxos();

			if (utxos.length === 0) {
				// No UTXOs is valid for unfunded address
				expect(utxos).toEqual([]);
				return;
			}

			const utxo = utxos[0]!;
			const sourceTx = await utxoProvider.getSourceTransaction(utxo.txid);

			expect(sourceTx).toBeDefined();
			expect(sourceTx.id("hex")).toBe(utxo.txid);
			expect(sourceTx.outputs.length).toBeGreaterThan(utxo.vout);

			const output = sourceTx.outputs[utxo.vout];
			expect(output).toBeDefined();
			expect(output?.satoshis).toBe(utxo.satoshis);
		} catch (error) {
			// 400 means no UTXOs, which is valid
			if (error instanceof Error && error.message.includes("400 Bad Request")) {
				expect(error.message).toContain("Failed to fetch UTXOs");
			} else {
				throw error;
			}
		}
	});

	it("should parse transaction hex from WhatsOnChain (if UTXOs exist)", async () => {
		try {
			const utxos = await utxoProvider.getUtxos();

			if (utxos.length === 0) {
				expect(utxos).toEqual([]);
				return;
			}

			const utxo = utxos[0]!;
			const sourceTx = await utxoProvider.getSourceTransaction(utxo.txid);
			const txHex = sourceTx.toHex();

			expect(typeof txHex).toBe("string");
			expect(txHex.length).toBeGreaterThan(0);
			expect(txHex).toMatch(/^[0-9a-f]+$/i);

			const parsed = await parser.parseTransaction(txHex);
			expect(parsed.id).toBe(utxo.txid);
		} catch (error) {
			if (error instanceof Error && error.message.includes("400 Bad Request")) {
				expect(error.message).toContain("Failed to fetch UTXOs");
			} else {
				throw error;
			}
		}
	});

	it("should validate transaction creation flow (requires funds)", async () => {
		const testData: BlockchainTransactionData = {
			customData: "WhatsOnChain Integration Test",
			payments: {},
		};

		try {
			const created = await factory.makeTransaction(testData);

			expect(created).toBeDefined();
			expect(created.id).toBeTruthy();
			expect(typeof created.id).toBe("string");
			expect(created.id.length).toBe(64);

			const txHex = created.serializedTransaction();
			expect(txHex).toBeTruthy();
			expect(txHex).toMatch(/^[0-9a-f]+$/i);

			const parsed = await parser.parseTransaction(txHex);
			expect(parsed.id).toBe(created.id);
			expect(parsed.data.customData).toBe(testData.customData);
		} catch (error) {
			// Expected errors for unfunded addresses
			if (error instanceof Error) {
				const validErrors = ["Insufficient funds", "400 Bad Request", "Failed to fetch UTXOs"];
				expect(validErrors.some((msg) => error.message.includes(msg))).toBe(true);
			} else {
				throw error;
			}
		}
	});
});
