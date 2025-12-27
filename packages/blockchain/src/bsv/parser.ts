import { Transaction, Utils } from "@bsv/sdk";
import type {
	BlockchainTransactionParser,
	ParsedBlockchainTransactionHandle,
} from "../defines/parser";
import type { BlockchainTransactionData } from "../defines/transactionData";

/**
 * Parser for BSV blockchain transactions that extracts custom data and payments.
 * Uses WhatsOnChain API for fetching transactions.
 */
export class BsvTransactionParser implements BlockchainTransactionParser {
	constructor(private readonly network: "main" | "test" | "stn" = "main") {}

	private async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	async findTransactionById(id: string): Promise<ParsedBlockchainTransactionHandle | null> {
		try {
			// Fetch transaction from WhatsOnChain
			const txUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${id}/hex`;
			const response = await fetch(txUrl);

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to fetch transaction: ${response.status} ${response.statusText}`);
			}

			await this.sleep(500);

			const txHex = await response.text();

			// Check if transaction is confirmed
			const confirmUrl = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${id}`;
			const confirmResponse = await fetch(confirmUrl);
			let isFinalized = false;

			if (confirmResponse.ok) {
				await this.sleep(500);
				const txInfo = await confirmResponse.json();
				isFinalized = txInfo.confirmations > 0;
			}

			return this.parseTransactionWithFinalization(txHex, isFinalized);
		} catch (error) {
			if (error instanceof Error && error.message.includes("404")) {
				return null;
			}
			throw error;
		}
	}

	async parseTransaction(serializedTransaction: string): Promise<ParsedBlockchainTransactionHandle> {
		return this.parseTransactionWithFinalization(serializedTransaction, false);
	}

	private parseTransactionWithFinalization(
		serializedTransaction: string,
		isFinalized: boolean,
	): ParsedBlockchainTransactionHandle {
		const tx = Transaction.fromHex(serializedTransaction);
		const txid = tx.id("hex");

		// Extract custom data from OP_RETURN outputs
		let customData: string | null = null;
		for (const output of tx.outputs) {
			const scriptHex = output.lockingScript.toHex();
			// Check if it's an OP_RETURN script (starts with 006a or just 6a)
			if (scriptHex.startsWith("006a") || scriptHex.startsWith("6a")) {
				customData = this.extractOpReturnData(scriptHex);
				break;
			}
		}

		// Extract payments from P2PKH outputs
		const payments: { [to: string]: number } = {};

		for (const output of tx.outputs) {
			const scriptHex = output.lockingScript.toHex();

			// Check if it's a P2PKH script (OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG)
			// Pattern: 76a914<20 bytes>88ac
			if (this.isP2PKHScript(scriptHex)) {
				const address = this.extractP2PKHAddress(scriptHex);
				const satoshis = output.satoshis ?? 0;

				// Skip dust outputs (likely change)
				if (satoshis > 0) {
					if (payments[address]) {
						payments[address] += satoshis;
					} else {
						payments[address] = satoshis;
					}
				}
			}
		}

		const data: BlockchainTransactionData = {
			customData,
			payments,
		};

		return {
			id: txid,
			data,
			serializedTransaction: () => serializedTransaction,
			isFinalized,
		};
	}

	private extractOpReturnData(scriptHex: string): string | null {
		try {
			// Remove OP_FALSE OP_RETURN prefix (006a or 6a)
			const hex = scriptHex.startsWith("006a") ? scriptHex.slice(4) : scriptHex.slice(2);

			// Parse the push data
			const firstByte = parseInt(hex.slice(0, 2), 16);

			let dataHex: string;
			if (firstByte <= 75) {
				// Direct push
				const length = firstByte;
				dataHex = hex.slice(2, 2 + length * 2);
			} else if (firstByte === 0x4c) {
				// OP_PUSHDATA1
				const length = parseInt(hex.slice(2, 4), 16);
				dataHex = hex.slice(4, 4 + length * 2);
			} else if (firstByte === 0x4d) {
				// OP_PUSHDATA2 (little-endian length)
				const lengthBytes = hex.slice(2, 6);
				const length = parseInt(lengthBytes.slice(2, 4) + lengthBytes.slice(0, 2), 16);
				dataHex = hex.slice(6, 6 + length * 2);
			} else {
				return null;
			}

			// Convert hex to UTF-8 string
		const bytes = this.hexToUint8Array(dataHex);
		return new TextDecoder().decode(bytes);
	} catch {
		return null;
	}
}

private hexToUint8Array(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

private isP2PKHScript(scriptHex: string): boolean {
	// P2PKH pattern: 76a914<20 bytes>88ac (25 bytes total = 50 hex chars)
	return scriptHex.length === 50 && scriptHex.startsWith("76a914") && scriptHex.endsWith("88ac");
}
	private extractP2PKHAddress(scriptHex: string): string {
		// Extract the 20-byte public key hash from the script
		// Pattern: 76a914<20 bytes>88ac
		const pubKeyHashHex = scriptHex.slice(6, 46);

		// Convert hex string to byte array
		const pubKeyHash: number[] = [];
		for (let i = 0; i < pubKeyHashHex.length; i += 2) {
			pubKeyHash.push(parseInt(pubKeyHashHex.slice(i, i + 2), 16));
		}

		// Encode as Base58Check address with network prefix using SDK's utilities
		const prefix = this.getNetworkPrefix();
		return Utils.toBase58Check(pubKeyHash, prefix);
	}

	private getNetworkPrefix(): number[] {
		// Network version bytes for P2PKH addresses
		// mainnet: 0x00, testnet: 0x6f
		switch (this.network) {
			case "test":
			case "stn":
				return [0x6f];
			case "main":
			default:
				return [0x00];
		}
	}
}
