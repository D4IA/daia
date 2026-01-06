import type {
	BlockchainTransactionFetcher,
	RawTransaction,
	RawTransactionShortDetails,
	TransactionHashPage,
} from "../defines/fetcher";
import { TRANSACTIONS_PER_BATCH, WhatsOnChainEndpoints, type FetcherConfig } from "./fetcherConfig";
import { FetchThrottler } from "./fetchThrottler";
import { chunkArray, promisePool } from "./fetcherUtils";
import { BsvNetwork } from "./network";

/**
 * WhatsOnChain implementation of BlockchainTransactionFetcher.
 * Fetches transaction data from the WhatsOnChain API with rate limiting.
 */
export class WhatsOnChainTransactionFetcher implements BlockchainTransactionFetcher {
	private readonly endpoints: WhatsOnChainEndpoints;
	private readonly throttler: FetchThrottler;
	private readonly apiKey: string | undefined;

	constructor(network: BsvNetwork = BsvNetwork.MAIN, config: FetcherConfig = {}) {
		this.endpoints = new WhatsOnChainEndpoints(network);
		this.throttler = new FetchThrottler(config.rps);
		this.apiKey = config.apiKey;
	}

	private async fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
		try {
			const headers = new Headers(options?.headers);
			if (this.apiKey) {
				headers.set("Authorization", this.apiKey);
			}

			const response = await this.throttler.throttledFetch(url, {
				...options,
				headers,
			});

			if (response.status === 404) return null;
			if (!response.ok) {
				console.error(`HTTP error: ${response.status} for ${url}`);
				return null;
			}

			return (await response.json()) as T;
		} catch (error) {
			console.error(`Fetch failed for ${url}:`, error);
			return null;
		}
	}

	async fetchTransactionById(id: string): Promise<RawTransaction | null> {
		return this.fetchJson<RawTransaction>(this.endpoints.getTransactionById(id));
	}

	async fetchTransactionHashes(
		address: string,
		params?: { limit?: number; pageToken?: string },
	): Promise<TransactionHashPage | null> {
		return this.fetchJson<TransactionHashPage>(
			this.endpoints.getConfirmedTransactionsByAddress(address, params),
		);
	}

	async fetchBulkTransactionDetails(txIds: string[]): Promise<RawTransaction[]> {
		const result = await this.fetchJson<RawTransaction[]>(
			this.endpoints.getBulkTransactionDetails(),
			{
				method: "POST",
				body: JSON.stringify({ txids: txIds }),
			},
		);
		return result ?? [];
	}

	async fetchBulkRawTransactionData(txIds: string[]): Promise<RawTransactionShortDetails[]> {
		const result = await this.fetchJson<RawTransactionShortDetails[]>(
			this.endpoints.getBulkRawTransactionData(),
			{
				method: "POST",
				body: JSON.stringify({ txids: txIds }),
			},
		);
		return result ?? [];
	}

	async fetchTransactionsByAddress(address: string): Promise<RawTransaction[]> {
		// Collect all transaction hashes with pagination
		const transactionHashes: string[] = [];
		let pageToken: string | undefined = undefined;
		let pageCount = 1;

		while (true) {
			const page = await this.fetchTransactionHashes(address, pageToken ? { pageToken } : undefined);

			if (!page) return [];

			const hashes = page.result.map((tx) => tx.tx_hash);
			transactionHashes.push(...hashes);

			console.log(`Fetching page ${pageCount++}`);

			if (!page.nextPageToken) break;
			pageToken = page.nextPageToken;
		}

		// Fetch transaction details in batches
		const chunks = chunkArray(transactionHashes, TRANSACTIONS_PER_BATCH);

		console.log(`Fetching ${chunks.length} chunks with concurrency limit...`);

		const chunkTasks = chunks.map((chunk, idx) => async () => {
			const details = await this.fetchBulkTransactionDetails(chunk);
			console.log(`Fetched chunk ${idx + 1} / ${chunks.length}`);
			return details;
		});

		const results = await promisePool(chunkTasks, 50);
		return results.flat();
	}
}

// Re-export config types for convenience
export type { FetcherConfig } from "./fetcherConfig";
