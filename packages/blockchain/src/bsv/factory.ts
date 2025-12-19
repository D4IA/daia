import {
	Transaction,
	PrivateKey,
	P2PKH,
	WhatsOnChainBroadcaster,
	LockingScript,
	SatoshisPerKilobyte,
} from "@bsv/sdk";
import type {
	BlockchainTransactionFactory,
	CreatedBlockchainTransactionHandle,
} from "../defines/factory";
import type { BlockchainTransactionData } from "../defines/transactionData";
import { WhatsOnChainUtxoProvider, type UtxoProvider } from "./utxoProvider";

/**
 * Minimal BSV blockchain factory for storing data in OP_RETURN outputs.
 * Uses WhatsOnChain API for broadcasting transactions and discovering UTXOs.
 */
export class BsvTransactionFactory implements BlockchainTransactionFactory {
	private readonly utxoProvider: UtxoProvider;
	private readonly feeModel: SatoshisPerKilobyte;

	constructor(
		private readonly privateKey: PrivateKey,
		private readonly network: "main" | "test" | "stn" = "main",
		satoshisPerKilobyte: number = 1,
		utxoProvider?: UtxoProvider,
	) {
		this.utxoProvider = utxoProvider ?? new WhatsOnChainUtxoProvider(privateKey, network);
		this.feeModel = new SatoshisPerKilobyte(satoshisPerKilobyte);
	}

	async makeTransaction(
		data: BlockchainTransactionData,
	): Promise<CreatedBlockchainTransactionHandle> {
		const tx = new Transaction();

		// Calculate total amount needed for payments
		const totalPayments = Object.values(data.payments).reduce((sum, amount) => sum + amount, 0);

		// Estimate initial fee for UTXO selection (will be recalculated)
		const estimatedFee = 500;
		const requiredAmount = totalPayments + estimatedFee;

		// Get UTXOs to fund the transaction
		const utxos = await this.utxoProvider.getUtxosWithTotal(requiredAmount);

		// Add inputs from UTXOs
		for (const utxo of utxos) {
			const sourceTransaction = await this.utxoProvider.getSourceTransaction(utxo.txid);

			const p2pkh = new P2PKH();
			tx.addInput({
				sourceTransaction,
				sourceOutputIndex: utxo.vout,
				unlockingScriptTemplate: p2pkh.unlock(this.privateKey),
			});
		}

		// Add payment outputs
		for (const [address, satoshis] of Object.entries(data.payments)) {
			tx.addP2PKHOutput(address, satoshis);
		}

		// Store custom data in OP_RETURN output if provided
		if (data.customData) {
			tx.addOutput({
				lockingScript: this.createOpReturnScript(data.customData),
				satoshis: 0,
			});
		}

		// Add change output (marked as change so fee calculation can adjust it)
		const changeAddress = this.privateKey.toPublicKey().toAddress();
		tx.addOutput({
			lockingScript: new P2PKH().lock(changeAddress),
			change: true,
		});

		// Calculate proper fee based on transaction size
		await tx.fee(this.feeModel);

		// Sign transaction
		await tx.sign();

		const txid = tx.id("hex");

		return {
			id: txid,
			data,
			serializedTransaction: () => tx.toHex(),
			publish: async () => {
				const broadcaster = new WhatsOnChainBroadcaster(this.network);
				const result = await tx.broadcast(broadcaster);

				if (result.status === "error") {
					throw new Error(`Broadcast failed: ${result.description} (code: ${result.code})`);
				}
			},
		};
	}

	private createOpReturnScript(data: string): LockingScript {
		// OP_FALSE OP_RETURN <data>
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
		} else if (length <= 65535) {
			// OP_PUSHDATA2
			const lengthHex = length.toString(16).padStart(4, "0");
			script += "4d" + lengthHex.slice(2, 4) + lengthHex.slice(0, 2); // little-endian
		}

		script += this.uint8ArrayToHex(dataBytes);
		return LockingScript.fromHex(script);
	}

	private uint8ArrayToHex(bytes: Uint8Array): string {
		return Array.from(bytes)
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
	}
}
