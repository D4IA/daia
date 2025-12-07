import { describe, it, expect } from "vitest";
import { PrivateKey, Transaction, P2PKH, LockingScript } from "@bsv/sdk";
import { BsvTransactionParser } from "../../bsv/parser";
import { BsvNetwork } from "../../bsv/network";
import type { BlockchainTransactionData } from "../transactionData";

/**
 * Helper to create OP_RETURN script with custom data
 */
function createOpReturnScript(data: string): LockingScript {
	const dataBytes = new TextEncoder().encode(data);
	const length = dataBytes.length;

	// Build script: OP_FALSE(0x00) OP_RETURN(0x6a) PUSHDATA
	let script = "006a"; // OP_FALSE OP_RETURN

	if (length <= 75) {
		// Direct push
		script += length.toString(16).padStart(2, "0");
	} else if (length <= 255) {
		// OP_PUSHDATA1
		script += "4c" + length.toString(16).padStart(2, "0");
	}

	// Convert data to hex
	script += Array.from(dataBytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

	return LockingScript.fromHex(script);
}

describe("BlockchainTransactionParser - Security", () => {
	it("should not store public keys in BlockchainTransactionData type after parsing transaction", async () => {
		// Create a real transaction with BSV SDK
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();

		// Create a transaction with custom data and a payment
		const tx = new Transaction();

		// Add a dummy input (required for valid transaction)
		const sourceTx = new Transaction();
		sourceTx.addOutput({
			lockingScript: new P2PKH().lock(publicKey.toHash() as number[]),
			satoshis: 10000,
		});

		tx.addInput({
			sourceTransaction: sourceTx,
			sourceOutputIndex: 0,
			unlockingScriptTemplate: new P2PKH().unlock(privateKey),
		});

		// Add OP_RETURN with custom data
		const customDataString = "Test custom data without keys";
		tx.addOutput({
			lockingScript: createOpReturnScript(customDataString),
			satoshis: 0,
		});

		// Add payment output to a recipient
		const recipientKey = PrivateKey.fromRandom();
		const recipientAddress = recipientKey.toPublicKey().toAddress();
		tx.addOutput({
			lockingScript: new P2PKH().lock(recipientKey.toPublicKey().toHash() as number[]),
			satoshis: 5000,
		});

		// Sign the transaction
		await tx.sign();

		// Serialize and parse the transaction
		const txHex = tx.toHex();
		const parser = new BsvTransactionParser(BsvNetwork.MAIN);
		const parsed = await parser.parseTransaction(txHex);

		// Verify that BlockchainTransactionData only contains expected fields
		const data: BlockchainTransactionData = parsed.data;
		const dataKeys = Object.keys(data);

		// BlockchainTransactionData should only have 'customData' and 'payments' fields
		expect(dataKeys).toEqual(expect.arrayContaining(["customData", "payments"]));
		expect(dataKeys.length).toBe(2);

		// Verify stored data
		expect(data.customData).toBe(customDataString);
		expect(data.payments[recipientAddress]).toBe(5000);
		expect(Object.keys(data.payments)).toEqual([recipientAddress]);
	});

	it("should only return addresses for the correct network", async () => {
		// Create transaction on mainnet
		const privateKey = PrivateKey.fromRandom();
		const publicKey = privateKey.toPublicKey();

		const tx = new Transaction();
		const sourceTx = new Transaction();
		sourceTx.addOutput({
			lockingScript: new P2PKH().lock(publicKey.toHash() as number[]),
			satoshis: 10000,
		});
		
		tx.addInput({
			sourceTransaction: sourceTx,
			sourceOutputIndex: 0,
			unlockingScriptTemplate: new P2PKH().unlock(privateKey),
		});

		// Add payment output
		const recipientKey = PrivateKey.fromRandom();
		const mainnetAddress = recipientKey.toPublicKey().toAddress("main");
		tx.addOutput({
			lockingScript: new P2PKH().lock(recipientKey.toPublicKey().toHash() as number[]),
			satoshis: 5000,
		});

		await tx.sign();

		// Parse with mainnet parser
		const mainParser = new BsvTransactionParser(BsvNetwork.MAIN);
		const mainParsed = await mainParser.parseTransaction(tx.toHex());
		expect(Object.keys(mainParsed.data.payments)).toEqual([mainnetAddress]);

		// Parse with testnet parser - should return testnet address for same hash
		const testParser = new BsvTransactionParser(BsvNetwork.TEST);
		const testParsed = await testParser.parseTransaction(tx.toHex());
		const testnetAddress = recipientKey.toPublicKey().toAddress("test");
		expect(Object.keys(testParsed.data.payments)).toEqual([testnetAddress]);
		expect(Object.keys(testParsed.data.payments)).not.toContain(mainnetAddress);
	});
});
