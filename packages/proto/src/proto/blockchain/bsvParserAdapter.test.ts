import { describe, expect, test } from "vitest";
import { Transaction, LockingScript, P2PKH, PrivateKey, UnlockingScript } from "@bsv/sdk";
import { BsvTransactionParserAdapter } from "./bsvParserAdapter";

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const makeOpReturnHex = (payload: string) => {
	const payloadHex = toHex(encoder.encode(payload));
	const lenHex = (payloadHex.length / 2).toString(16).padStart(2, "0");
	return `6a${lenHex}${payloadHex}`;
};

const buildTx = (opReturnHex?: string) => {
	const tx = new Transaction();
	tx.addInput({
		sourceTXID: "0".repeat(64),
		sourceOutputIndex: 0,
		unlockingScript: UnlockingScript.fromHex(""),
	});

	const priv = PrivateKey.fromRandom();
	const locking = new P2PKH().lock(priv.toAddress());
	tx.addOutput({ satoshis: 1100, lockingScript: locking });

	if (opReturnHex) {
		tx.addOutput({
			satoshis: 0,
			lockingScript: LockingScript.fromHex(opReturnHex),
		});
	}

	return {
		tx,
		recipient: locking.toHex().match(/^76a914([0-9a-f]{40})88ac$/i)?.[1],
	};
};

describe("BsvTransactionParserAdapter", () => {
	test("parses payments and DAIA data", async () => {
		const data = {
			type: "agreement",
			agreement: {
				offerContentSerialized: "{}",
				proofs: { a: { type: "sign", signeeNonce: "n", signature: "s" } },
			},
		};
		const { tx, recipient } = buildTx(makeOpReturnHex(JSON.stringify(data)));
		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());

		expect(recipient).toBeDefined();
		expect(parsed.payments[recipient!]).toBe(1100);
		expect(parsed.data?.type).toBe("agreement");
		if (parsed.data?.type === "agreement") {
			expect(parsed.data.agreement.offerContentSerialized).toBe("{}");
			expect(parsed.data.agreement.proofs instanceof Map).toBe(true);
			expect(parsed.data.agreement.proofs.get("a")?.type).toBe("sign");
		}
	});

	test("aggregates multiple P2PKH outputs", async () => {
		const tx = new Transaction();
		tx.addInput({
			sourceTXID: "0".repeat(64),
			sourceOutputIndex: 0,
			unlockingScript: UnlockingScript.fromHex(""),
		});

		const privA = PrivateKey.fromRandom();
		const privB = PrivateKey.fromRandom();
		const lockA = new P2PKH().lock(privA.toAddress());
		const lockB = new P2PKH().lock(privB.toAddress());

		tx.addOutput({ satoshis: 500, lockingScript: lockA });
		tx.addOutput({ satoshis: 700, lockingScript: lockA });
		tx.addOutput({ satoshis: 900, lockingScript: lockB });

		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());

		const a = lockA.toHex().match(/^76a914([0-9a-f]{40})88ac$/i)?.[1];
		const b = lockB.toHex().match(/^76a914([0-9a-f]{40})88ac$/i)?.[1];

		expect(parsed.data).toBeNull();
		expect(parsed.payments[a ?? ""]).toBe(1200);
		expect(parsed.payments[b ?? ""]).toBe(900);
	});

	test("keeps data null when no OP_RETURN is present", async () => {
		const tx = new Transaction();
		tx.addInput({
			sourceTXID: "0".repeat(64),
			sourceOutputIndex: 0,
			unlockingScript: UnlockingScript.fromHex(""),
		});

		const priv = PrivateKey.fromRandom();
		const lock = new P2PKH().lock(priv.toAddress());
		tx.addOutput({ satoshis: 321, lockingScript: lock });

		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());
		const addr = lock.toHex().match(/^76a914([0-9a-f]{40})88ac$/i)?.[1];

		expect(parsed.data).toBeNull();
		expect(parsed.payments[addr ?? ""]).toBe(321);
	});

	test("parses OP_RETURN with 006a prefix", async () => {
		const payload = JSON.stringify({
			type: "agreement",
			agreement: { offerContentSerialized: "x", proofs: {} },
		});
		const payloadHex = toHex(encoder.encode(payload));
		const lenHex = (payloadHex.length / 2).toString(16).padStart(2, "0");
		const opReturn = `006a${lenHex}${payloadHex}`;

		const { tx } = buildTx(opReturn);
		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());

		expect(parsed.data?.type).toBe("agreement");
		if (parsed.data?.type === "agreement") {
			expect(parsed.data.agreement.offerContentSerialized).toBe("x");
		}
	});

	test("ignores non-P2PKH outputs for payments", async () => {
		const tx = new Transaction();
		tx.addInput({
			sourceTXID: "0".repeat(64),
			sourceOutputIndex: 0,
			unlockingScript: UnlockingScript.fromHex(""),
		});

		const priv = PrivateKey.fromRandom();
		const lock = new P2PKH().lock(priv.toAddress());
		tx.addOutput({ satoshis: 123, lockingScript: lock });

		// bare OP_TRUE output should not be counted
		tx.addOutput({
			satoshis: 999,
			lockingScript: LockingScript.fromASM("OP_TRUE"),
		});

		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());
		const addr = lock.toHex().match(/^76a914([0-9a-f]{40})88ac$/i)?.[1];

		expect(parsed.payments[addr ?? ""]).toBe(123);
		expect(Object.values(parsed.payments).reduce((a, b) => a + b, 0)).toBe(123);
	});

	test("returns null data for invalid JSON", async () => {
		const { tx, recipient } = buildTx(makeOpReturnHex("not-json"));
		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());

		expect(parsed.data).toBeNull();
		expect(recipient).toBeDefined();
		expect(parsed.payments[recipient!]).toBe(1100);
	});

	test("returns null data for invalid schema", async () => {
		const invalidSchemaPayload = JSON.stringify({ foo: "bar" });
		const { tx } = buildTx(makeOpReturnHex(invalidSchemaPayload));
		const parsed = await new BsvTransactionParserAdapter().parseTransaction(tx.toHex());

		expect(parsed.data).toBeNull();
	});
});
