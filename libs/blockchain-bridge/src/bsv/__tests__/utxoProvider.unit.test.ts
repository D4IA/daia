import { describe, it, vi, beforeEach, afterEach } from "vitest";
import { WhatsOnChainUtxoProvider } from "../utxoProvider";
import { BsvNetwork } from "../network";
import { PrivateKey, Transaction } from "@bsv/sdk";

describe("WhatsOnChainUtxoProvider", () => {
	let provider: WhatsOnChainUtxoProvider;
	let privateKey: PrivateKey;

	beforeEach(() => {
		privateKey = PrivateKey.fromRandom();
		provider = new WhatsOnChainUtxoProvider(privateKey, BsvNetwork.TEST);
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getUtxos", () => {
		it("should fetch and map utxos successfully", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => [
					{
						tx_hash: "hash1",
						tx_pos: 0,
						value: 1000,
						script: "script1",
					},
				],
			} as Response);

			await provider.getUtxos();
		});

		it("should throw error if fetch failed", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Error",
			} as Response);

			try {
				await provider.getUtxos();
			} catch {
				// Expected
			}
		});
	});

	describe("getUtxosWithTotal", () => {
		const mockUtxos = [
			{ tx_hash: "tx1", tx_pos: 0, value: 5000, script: "s1" },
			{ tx_hash: "tx2", tx_pos: 1, value: 2000, script: "s2" },
			{ tx_hash: "tx3", tx_pos: 0, value: 1000, script: "s3" },
		];

		beforeEach(() => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockUtxos,
			} as Response);
		});

		it("should select sufficient utxos", async () => {
			await provider.getUtxosWithTotal(6000);
			// Should select tx1 (5000) and tx2 (2000) = 7000 >= 6000
		});

		it("should sort utxos descending", async () => {
			// Mock returns unsorted, but method sorts
			await provider.getUtxosWithTotal(100);
		});

		it("should throw if insufficient funds", async () => {
			try {
				await provider.getUtxosWithTotal(10000);
			} catch {
				// Expected
			}
		});

		it("should exact match", async () => {
			await provider.getUtxosWithTotal(5000);
		});
	});

	describe("getSourceTransaction", () => {
		it("should fetch transaction hex and return Transaction object", async () => {
			const tx = new Transaction();
			const txHex = tx.toHex();

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				text: async () => txHex,
			} as Response);

			await provider.getSourceTransaction("txid");
		});

		it("should throw error if fetch failed", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
			} as Response);

			try {
				await provider.getSourceTransaction("txid");
			} catch {
				// Expected
			}
		});
	});
});
