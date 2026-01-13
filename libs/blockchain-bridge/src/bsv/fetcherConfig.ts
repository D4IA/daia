import { BsvNetwork } from "./network";

/**
 * Configuration for the transaction fetcher.
 */
export interface FetcherConfig {
	/**
	 * API Key for WhatsOnChain authentication.
	 * Providing an API key allows for higher rate limits.
	 */
	apiKey?: string;

	/**
	 * Requests Per Second (RPS) limit for the internal throttler.
	 * Default public limit: 3 RPS.
	 * With API Key: typically 10, 20, or 40 RPS depending on the plan.
	 * @default 3
	 */
	rps?: number;
}

export const DEFAULT_REQUESTS_PER_SECOND = 3;
export const TRANSACTIONS_PER_BATCH = 20;

/**
 * Generates WhatsOnChain API endpoint URLs.
 */
export class WhatsOnChainEndpoints {
	private readonly baseUrl: string;

	constructor(network: BsvNetwork) {
		const net = network === BsvNetwork.MAIN ? "main" : "test";
		this.baseUrl = `https://api.whatsonchain.com/v1/bsv/${net}`;
	}

	getTransactionById(txId: string): string {
		return `${this.baseUrl}/tx/${txId}`;
	}

	getBulkTransactionDetails(): string {
		return `${this.baseUrl}/txs`;
	}

	getBulkRawTransactionData(): string {
		return `${this.baseUrl}/txs/hex`;
	}

	getTransactionsByAddress(
		address: string,
		params?: { limit?: number; pageToken?: string },
		confirmed?: boolean,
	): string {
		const confirmedOrNotString = confirmed ? "confirmed" : "unconfirmed";
		const url = new URL(`${this.baseUrl}/address/${address}/${confirmedOrNotString}/history`);
		if (params?.limit) {
			url.searchParams.set("limit", params.limit.toString());
		}
		if (params?.pageToken) {
			url.searchParams.set("token", params.pageToken);
		}
		return url.toString();
	}

	getConfirmedTransactionsByAddress(
		address: string,
		params?: { limit?: number; pageToken?: string },
	): string {
		return this.getTransactionsByAddress(address, params, true);
	}

	getUnconfirmedTransactionsByAddress(
		address: string,
		params?: { limit?: number; pageToken?: string },
	): string {
		return this.getTransactionsByAddress(address, params, false);
	}
}
