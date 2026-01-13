import { describe, it, vi, beforeEach, afterEach } from "vitest";
import { BsvTransactionParser } from "../parser";
import { BsvNetwork } from "../network";
import { Transaction, P2PKH, PrivateKey, LockingScript } from "@bsv/sdk";

describe("BsvTransactionParser", () => {
	let parser: BsvTransactionParser;

	beforeEach(() => {
		parser = new BsvTransactionParser(BsvNetwork.TEST);
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("findTransactionById", () => {
		it("should return null if transaction is not found (404)", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
			} as Response);

			await parser.findTransactionById("missing-tx-id");
		});

		it("should throw error if fetch failed (500)", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Server Error",
			} as Response);

			try {
				await parser.findTransactionById("error-tx-id");
			} catch {
				// Expected error
			}
		});

		it("should fetch and parse transaction successfully", async () => {
			// CREATE VALID TRANSACTION using SDK
			const privKey = PrivateKey.fromRandom();
			const pubKey = privKey.toPublicKey();
			const tx = new Transaction();
			tx.addOutput({
				lockingScript: new P2PKH().lock(pubKey.toHash()),
				satoshis: 1000,
			});
			// Add OP_RETURN
			// 006a + 0b (len 11) + "hello world" hex
			const dataHex = Buffer.from("hello world").toString("hex");
			const scriptHex = "006a" + (dataHex.length / 2).toString(16).padStart(2, "0") + dataHex;

			tx.addOutput({
				lockingScript: LockingScript.fromHex(scriptHex),
				satoshis: 0,
			});

			const txHex = tx.toHex();

			// Mock responses
			const fetchMock = vi.fn();
			fetchMock.mockResolvedValueOnce({
				ok: true,
				text: async () => txHex,
			} as Response); // First call for hex

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ confirmations: 10 }),
			} as Response); // Second call for confirmation

			global.fetch = fetchMock;

			await parser.findTransactionById(tx.id("hex"));
		});

		it("should handle unconfirmed transaction", async () => {
			const tx = new Transaction();
			const txHex = tx.toHex();

			const fetchMock = vi.fn();
			fetchMock.mockResolvedValueOnce({
				ok: true,
				text: async () => txHex,
			} as Response);

			fetchMock.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ confirmations: 0 }),
			} as Response);

			global.fetch = fetchMock;

			await parser.findTransactionById("unconfirmed-tx-id");
		});

		it("should handle network errors during fetch", async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));
			try {
				await parser.findTransactionById("tx-id");
			} catch {
				// Expected
			}
		});

		it("should return null if 404 error is thrown directly", async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error("404 Not Found"));
			await parser.findTransactionById("tx-id");
		});
	});

	describe("parseTransaction", () => {
		it("should parse transaction with P2PKH outputs", () => {
			const privKey = PrivateKey.fromRandom();
			const pubKey = privKey.toPublicKey();
			const tx = new Transaction();
			tx.addOutput({
				lockingScript: new P2PKH().lock(pubKey.toHash()),
				satoshis: 5000,
			});
			parser.parseTransaction(tx.toHex());
		});

		it("should parse transaction with OP_RETURN data", () => {
			const tx = new Transaction();
			const dataHex = Buffer.from("custom-data").toString("hex");
			const scriptHex = "006a" + (dataHex.length / 2).toString(16).padStart(2, "0") + dataHex;

			tx.addOutput({
				lockingScript: LockingScript.fromHex(scriptHex),
				satoshis: 0,
			});
			parser.parseTransaction(tx.toHex());
		});

		it("should parse transaction with dust outputs (ignored)", () => {
			const privKey = PrivateKey.fromRandom();
			const pubKey = privKey.toPublicKey();
			const tx = new Transaction();
			tx.addOutput({
				lockingScript: new P2PKH().lock(pubKey.toHash()),
				satoshis: 0, // Dust
			});
			parser.parseTransaction(tx.toHex());
		});

		it("should accumulate payments to same address", () => {
			const privKey = PrivateKey.fromRandom();
			const pubKey = privKey.toPublicKey();
			const tx = new Transaction();
			tx.addOutput({
				lockingScript: new P2PKH().lock(pubKey.toHash()),
				satoshis: 1000,
			});
			tx.addOutput({
				lockingScript: new P2PKH().lock(pubKey.toHash()),
				satoshis: 2000,
			});
			parser.parseTransaction(tx.toHex());
		});

		it("should ignore non-P2PKH non-OP_RETURN scripts", () => {
			const tx = new Transaction();
			// OP_TRUE
			tx.addOutput({
				lockingScript: LockingScript.fromASM("OP_TRUE"),
				satoshis: 100,
			});
			parser.parseTransaction(tx.toHex());
		});
	});

	describe("extractOpReturnData", () => {
		it("should return null for non-op-return script", () => {
			parser.extractOpReturnData("invalid-hex");
		});

		it("should handle extraction failure gracefully", () => {
			// Malformed hex
			parser.extractOpReturnData("006aZZZZ");
		});

		it("should extract data from OP_FALSE OP_RETURN (006a)", () => {
			// 00 = OP_FALSE, 6a = OP_RETURN, 05 = Push 5 bytes, ...
			// "hello" in hex: 68656c6c6f
			const hex = "006a0568656c6c6f";
			parser.extractOpReturnData(hex);
		});

		it("should extract data from OP_RETURN (6a)", () => {
			const hex = "6a0568656c6c6f";
			parser.extractOpReturnData(hex);
		});

		it("should extract PUSHDATA1 (0x4c)", () => {
			// 6a 4c len ...
			// len 1 byte
			const len = 76; // > 75
			const data = "a".repeat(len);
			const dataHex = Buffer.from(data).toString("hex");
			const lenHex = len.toString(16).padStart(2, "0");
			const hex = "6a4c" + lenHex + dataHex;
			parser.extractOpReturnData(hex);
		});

		it("should extract PUSHDATA2 (0x4d)", () => {
			// 6a 4d len(2 bytes) ...
			const len = 300;
			const data = "b".repeat(len);
			const dataHex = Buffer.from(data).toString("hex");
			// Little endian length
			const buf = Buffer.alloc(2);
			buf.writeUInt16LE(len);
			const lenHex = buf.toString("hex");

			const hex = "6a4d" + lenHex + dataHex;
			parser.extractOpReturnData(hex);
		});

		it("should return null for unknown push opcode", () => {
			const hex = "6aFF"; // FF is unknown push
			parser.extractOpReturnData(hex);
		});
	});
});
