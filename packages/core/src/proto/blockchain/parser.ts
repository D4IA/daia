import { ParsedTransaction } from "./defines";

export interface TransactionParserAdapter {
	parseTransaction: (transaction: string) => Promise<ParsedTransaction>;
}

export interface TransactionFetcherAdapter {
	fetchTransactionById: (id: string) => Promise<string | null>;
	fetchTransactionByUrl: (url: string) => Promise<string | null>;
}

export class TransactionLoader {
	constructor(
		private readonly parser: TransactionParserAdapter,
		private readonly fetcher: TransactionFetcherAdapter,
	) {}

	async parse(transaction: string): Promise<ParsedTransaction> {
		return this.parser.parseTransaction(transaction);
	}

	async fetchById(id: string): Promise<ParsedTransaction | null> {
		const tx = await this.fetcher.fetchTransactionById(id);
		return tx ? this.parse(tx) : null;
	}

	async fetchByUrl(url: string): Promise<ParsedTransaction | null> {
		// Support bsv://<txid> scheme by extracting host as txid
		if (url.startsWith("bsv://")) {
			const txid = url.replace(/^bsv:\/\//, "");
			return this.fetchById(txid);
		}

		const tx = await this.fetcher.fetchTransactionByUrl(url);
		return tx ? this.parse(tx) : null;
	}
}
