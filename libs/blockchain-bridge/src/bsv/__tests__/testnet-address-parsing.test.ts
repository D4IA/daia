import { describe, it, expect } from "vitest";
import { PrivateKey, Transaction, P2PKH } from "@bsv/sdk";
import { BsvTransactionParser } from "../parser";
import { BsvNetwork } from "../network";

describe("BsvTransactionParser - Testnet Address Parsing", () => {
	it("should correctly parse testnet addresses in payment outputs", async () => {
		// Step 1: Generate a private key for the recipient
		const recipientPrivateKey = PrivateKey.fromRandom();
		const recipientPublicKey = recipientPrivateKey.toPublicKey();

		// Step 2: Convert it to a testnet address
		const testnetAddress = recipientPublicKey.toAddress("test");
		const paymentAmount = 5000;

		// Step 3: Generate transaction with another random private key (sender)
		const senderPrivateKey = PrivateKey.fromRandom();
		const senderPublicKey = senderPrivateKey.toPublicKey();

		// Create a transaction
		const tx = new Transaction();

		// Add a dummy input (funding source)
		const sourceTx = new Transaction();
		sourceTx.addOutput({
			lockingScript: new P2PKH().lock(senderPublicKey.toHash() as number[]),
			satoshis: 10000,
		});

		tx.addInput({
			sourceTransaction: sourceTx,
			sourceOutputIndex: 0,
			unlockingScriptTemplate: new P2PKH().unlock(senderPrivateKey),
		});

		// Add payment output to testnet address
		tx.addOutput({
			lockingScript: new P2PKH().lock(recipientPublicKey.toHash() as number[]),
			satoshis: paymentAmount,
		});

		// Sign the transaction
		await tx.sign();

		// Step 4: Parse the transaction with testnet parser
		const parser = new BsvTransactionParser(BsvNetwork.TEST);
		const parsed = await parser.parseTransaction(tx.toHex());

		// Step 5: Verify that payments field matches the input
		expect(parsed.data.payments).toHaveProperty(testnetAddress);
		expect(parsed.data.payments[testnetAddress]).toBe(paymentAmount);

		// Ensure it's actually a testnet address (starts with 'm' or 'n')
		expect(testnetAddress[0]).toMatch(/[mn]/);

		// Verify only one payment entry
		expect(Object.keys(parsed.data.payments)).toHaveLength(1);
	});
});
