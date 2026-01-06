import { parser, transactionFetcher } from "./transactionFetcher.service.js";
import {
	DaiaTransactionDataSchema,
	DaiaTransactionDataType,
	DaiaInnerOfferContentSchema,
} from "@d4ia/core";
import { daiaCacheService, CachedDaiaTransaction, DaiaAgreementData } from "./daiaCache.service.js";
import { WHATSONCHAIN_API } from "../constants/externalApi.const.js";
import { chunkArray } from "@d4ia/blockchain-bridge";

/**
 * Service for fetching and caching DAIA transactions.
 *
 * Caching Strategy: "Sync to depth with txId classification cache"
 * - Fetches tx hashes in bulk (limit=1000)
 * - Checks classification cache to skip known non-DAIA transactions
 * - Bulk fetches unknown transactions and classifies them
 * - Continues until enough DAIA transactions are found for the requested page
 */
export class DaiaTransactionService {
	/**
	 * Fetches DAIA transaction history with caching and pagination.
	 */
	async getDaiaHistory(address: string, offset: number, limit: number) {
		// 1. Fetch unconfirmed transactions first (no caching)
		const unconfirmedDaia = offset > 0 ? [] : await this.fetchUnconfirmedDaiaTransactions(address);
		console.log(`Found ${unconfirmedDaia.length} unconfirmed DAIA transactions`);

		// 2. Fetch confirmed transactions with caching
		const needed = offset + limit;
		let daiaCount = 0;
		let pageToken: string | undefined;

		while (daiaCount < needed) {
			// Fetch tx hashes (limit=1000)
			const page = await transactionFetcher.fetchTransactionHashes(address, {
				limit: 1000,
				pageToken,
			});

			if (!page || page.result.length === 0) {
				console.log("No more transaction hashes available");
				break;
			}

			console.log(`Fetched ${page.result.length} tx hashes, processing...`);

			// Partition: known vs unknown
			const unknown: string[] = [];

			for (const { tx_hash } of page.result) {
				const classification = daiaCacheService.getClassification(tx_hash);

				if (classification === null) {
					unknown.push(tx_hash);
				} else if (classification === true) {
					daiaCount++;
				}
				// classification === false → skip
			}

			console.log(`Known DAIA so far: ${daiaCount}, Unknown to fetch: ${unknown.length}`);

			// Bulk fetch unknown transactions
			if (unknown.length > 0) {
				const newDaiaCount = await this.fetchAndClassifyTransactions(unknown, address);
				daiaCount += newDaiaCount;
				console.log(
					`Classified ${unknown.length} txs, found ${newDaiaCount} new DAIA. Total: ${daiaCount}`,
				);
			}

			if (daiaCount >= needed) {
				console.log(`Reached needed count (${needed}), stopping sync`);
				break;
			}

			if (!page.nextPageToken) {
				console.log("No more pages available");
				break;
			}

			pageToken = page.nextPageToken;
		}

		// 3. Serve from cache with proper pagination
		const { transactions: confirmedTransactions, hasMore } = daiaCacheService.queryByAddress(
			address,
			offset,
			limit,
		);

		// 4. Combine: unconfirmed first, then confirmed (only on first page)
		let transactions: CachedDaiaTransaction[];
		if (offset === 0) {
			transactions = [...unconfirmedDaia, ...confirmedTransactions];
		} else {
			transactions = confirmedTransactions;
		}

		return {
			address,
			offset,
			limit,
			hasMore,
			unconfirmedTransactionsCount: unconfirmedDaia.length,
			transactions,
		};
	}

	/**
	 * Fetches unconfirmed DAIA transactions without caching.
	 */
	private async fetchUnconfirmedDaiaTransactions(address: string): Promise<CachedDaiaTransaction[]> {
		const unconfirmedDaia: CachedDaiaTransaction[] = [];

		const page = await transactionFetcher.fetchUnconfirmedTransactionHashes(address, { limit: 100 });
		if (!page || page.result.length === 0) {
			return [];
		}

		const txIds = page.result.map((tx) => tx.tx_hash);
		const chunks = chunkArray(txIds, WHATSONCHAIN_API.BULK_TX_LIMIT);

		for (const chunk of chunks) {
			const transactions = await transactionFetcher.fetchBulkTransactionDetails(chunk);

			for (const tx of transactions) {
				const daiaData = this.extractDaiaData(tx);
				if (daiaData) {
					unconfirmedDaia.push(daiaData);
				}
			}
		}

		return unconfirmedDaia;
	}

	/**
	 * Fetches a single DAIA transaction by ID.
	 */
	async getTransactionById(txId: string): Promise<CachedDaiaTransaction | null> {
		// Check cache first
		const cached = daiaCacheService.getDaiaTransaction(txId);
		if (cached) return cached;

		// Fetch from blockchain
		const tx = await transactionFetcher.fetchTransactionById(txId);
		if (!tx) return null;

		return this.extractDaiaData(tx);
	}

	/**
	 * Fetches and classifies transactions in bulk.
	 * Returns the count of new DAIA transactions found.
	 */
	private async fetchAndClassifyTransactions(txIds: string[], address: string): Promise<number> {
		let newDaiaCount = 0;
		const chunks = chunkArray(txIds, WHATSONCHAIN_API.BULK_TX_LIMIT);

		for (const chunk of chunks) {
			const transactions = await transactionFetcher.fetchBulkTransactionDetails(chunk);

			for (const tx of transactions) {
				const daiaData = this.extractDaiaData(tx);
				const isDaia = daiaData !== null;

				daiaCacheService.saveClassification(tx.txid, isDaia);

				if (isDaia) {
					daiaCacheService.saveDaiaTransaction(daiaData, address);
					newDaiaCount++;
				}
			}
		}

		return newDaiaCount;
	}

	/**
	 * Extracts DAIA agreement data from a raw transaction.
	 * Returns null if the transaction doesn't contain valid DAIA data.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private extractDaiaData(tx: any): CachedDaiaTransaction | null {
		if (!tx.vout || !Array.isArray(tx.vout)) {
			return null;
		}

		const isConfirmedTransaction = tx?.blocktime !== undefined;

		// Find first OP_RETURN output with DAIA data
		for (const output of tx.vout) {
			if (!output.scriptPubKey?.asm?.startsWith("OP_RETURN") || !output.scriptPubKey?.hex) {
				continue;
			}

			const jsonString = parser.extractOpReturnData(output.scriptPubKey.hex);
			if (!jsonString) continue;

			try {
				const parsed = JSON.parse(jsonString);

				// Convert proofs object to Map if present (Zod expects it)
				if (parsed.proofs && typeof parsed.proofs === "object") {
					parsed.proofs = new Map(Object.entries(parsed.proofs));
				}

				const txData = DaiaTransactionDataSchema.parse(parsed);
				if (txData.type !== DaiaTransactionDataType.AGREEMENT) {
					continue;
				}

				const agreement = txData.agreement;
				const contentParsed = JSON.parse(agreement.offerContent.inner);
				const offerContent = DaiaInnerOfferContentSchema.parse(contentParsed);

				const agreementData: DaiaAgreementData = {
					offerContentSerialized: agreement.offerContent.inner,
					proofs: Object.fromEntries(Object.entries(agreement.proofs)),
					naturalLanguageOfferContent: offerContent.naturalLanguageOfferContent,
					requirements: Object.fromEntries(Object.entries(offerContent.requirements)),
				};

				return {
					txId: tx.txid,
					agreement: agreementData,
					timestamp: tx.time || Date.now() / 1000,
					confirmed: isConfirmedTransaction,
				};
			} catch (e) {
				console.error("Invalid DAIA data in output, skipping", e);
			}
		}

		return null;
	}
}

export const daiaTransactionService = new DaiaTransactionService();
