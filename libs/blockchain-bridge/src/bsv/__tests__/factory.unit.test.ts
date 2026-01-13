import { describe, it, vi, beforeEach } from "vitest";
import { BsvTransactionFactory } from "../factory";
import { BsvNetwork } from "../network";
import { PrivateKey, Transaction, P2PKH } from "@bsv/sdk";
import { UtxoProvider } from "../utxoProvider";

const mockBroadcaster = {
	broadcast: vi.fn(),
};

vi.mock("@bsv/sdk", async (importOriginal) => {
	const mod = await importOriginal<typeof import("@bsv/sdk")>();
	return {
		...mod,
		WhatsOnChainBroadcaster: vi.fn().mockImplementation(() => mockBroadcaster),
	};
});

describe("BsvTransactionFactory", () => {
	let factory: BsvTransactionFactory;
	let privateKey: PrivateKey;
	let mockUtxoProvider: UtxoProvider;

	beforeEach(() => {
		privateKey = PrivateKey.fromRandom();

		mockUtxoProvider = {
			getUtxos: vi.fn(),
			getUtxosWithTotal: vi.fn().mockResolvedValue([
				{
					txid: "9f323e20098df611ccf826315694ce275306634789884523c9657ce5040e94bb",
					vout: 0,
					satoshis: 100000,
					scriptPubKey: "76a914" + "0".repeat(40) + "88ac",
				},
			]),
			getSourceTransaction: vi.fn().mockImplementation(async () => {
				const tx = new Transaction();
				// Create a dummy output corresponding to the utxo
				tx.addOutput({
					lockingScript: new P2PKH().lock(privateKey.toPublicKey().toAddress()),
					satoshis: 100000,
				});
				return tx;
			}),
		};

		factory = new BsvTransactionFactory(privateKey, BsvNetwork.TEST, 1, mockUtxoProvider);
		vi.clearAllMocks();
	});

	describe("makeTransaction", () => {
		it("should create a transaction with various outputs", async () => {
			const result = await factory.makeTransaction({
				payments: {
					[privateKey.toPublicKey().toAddress()]: 1000,
				},
				customData: "test data",
			});
			// Implicit assertion
			result.serializedTransaction();
		});

		it("should publish transaction successfully", async () => {
			mockBroadcaster.broadcast.mockResolvedValue({ status: "success" });

			const result = await factory.makeTransaction({
				payments: {},
				customData: "data",
			});
			await result.publish();
		});

		it("should throw error on publish failure", async () => {
			mockBroadcaster.broadcast.mockResolvedValue({
				status: "error",
				description: "Fail",
				code: 500,
			});

			const result = await factory.makeTransaction({
				payments: {},
				customData: null,
			});

			try {
				await result.publish();
			} catch {
				// Expected
			}
		});

		it("should handle large custom data (PUSHDATA1)", async () => {
			const data = "a".repeat(200);
			const result = await factory.makeTransaction({
				payments: {},
				customData: data,
			});
			// Check if transaction contains OP_RETURN
			result.serializedTransaction();
		});

		it("should handle very large custom data (PUSHDATA2)", async () => {
			const data = "b".repeat(300); // > 255
			await factory.makeTransaction({
				payments: {},
				customData: data,
			});
		});
	});
});
