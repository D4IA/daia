import { PrivateKey, Transaction } from "@bsv/sdk";
import { BsvNetwork } from "./network";

export interface UTXO {
	txid: string;
	vout: number;
	satoshis: number;
	scriptPubKey: string;
}

/**
 * Interface for UTXO providers.
 */
export interface UtxoProvider {
	getUtxos(): Promise<UTXO[]>;
	getUtxosWithTotal(requiredAmount: number): Promise<UTXO[]>;
	getSourceTransaction(txid: string): Promise<Transaction>;
}

/**
 * Discovers UTXOs for a given wallet using WhatsOnChain API.
 */
export class WhatsOnChainUtxoProvider implements UtxoProvider {
	constructor(
		private readonly privateKey: PrivateKey,
		private readonly network: BsvNetwork = BsvNetwork.MAIN,
	) {}

	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async getUtxos(): Promise<UTXO[]> {
		const address = this.privateKey
			.toPublicKey()
			.toAddress(this.network === "main" ? "mainnet" : "testnet");
		const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/address/${address}/unspent`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch UTXOs: ${response.status} ${response.statusText}`);
		}

		await this.sleep(500);

		const utxos: Array<{
			tx_hash: string;
			tx_pos: number;
			value: number;
			script: string;
		}> = await response.json();

		return utxos.map((utxo) => ({
			txid: utxo.tx_hash,
			vout: utxo.tx_pos,
			satoshis: utxo.value,
			scriptPubKey: utxo.script,
		}));
	}

	async getUtxosWithTotal(requiredAmount: number): Promise<UTXO[]> {
		const allUtxos = await this.getUtxos();

		// Sort by amount descending to optimize UTXO selection
		allUtxos.sort((a, b) => b.satoshis - a.satoshis);

		const selectedUtxos: UTXO[] = [];
		let totalAmount = 0;

		for (const utxo of allUtxos) {
			selectedUtxos.push(utxo);
			totalAmount += utxo.satoshis;

			if (totalAmount >= requiredAmount) {
				break;
			}
		}

		if (totalAmount < requiredAmount) {
			throw new Error(`Insufficient funds. Required: ${requiredAmount}, Available: ${totalAmount}`);
		}

		return selectedUtxos;
	}

	async getSourceTransaction(txid: string): Promise<Transaction> {
		const url = `https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${txid}/hex`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch transaction: ${response.status} ${response.statusText}`);
		}

		await this.sleep(500);

		const txHex = await response.text();
		return Transaction.fromHex(txHex);
	}
}
