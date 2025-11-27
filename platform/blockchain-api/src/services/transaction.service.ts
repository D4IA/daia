import { fetchTransactionHashes, fetchBulkTransactionDetails } from "@d4ia/blockchain-bridge";
import { paginationCacheService, CachedPage } from "./paginationCache.service";
import { WHATSONCHAIN_API } from "../constants/externalApi.const";

export interface PaginatedHistoryResponse {
  address: string;
  offset: number;
  limit: number;
  hasMore: boolean;
  transactions: any[];
}

export class TransactionService {
  /**
   * Retrieves paginated confirmed transaction history.
   * - First page (no token): always fresh
   * - Pages 2+ (with token): cached forever (immutable)
   * - Prefetches next 3 pages (sliding window) - TODO
   *
   * @note Caching Strategy:
   * We use a "Linked Page" strategy where each page points to the next page's first transaction hash.
   * WhatsOnChain API has a specific behavior where pages are ordered DESC (newest pages first),
   * but transactions WITHIN a page are ordered ASC (oldest first in the chunk).
   * 
   * When a new transaction arrives, it is appended to the END of Page 1. This pushes the 
   * FIRST transaction of Page 1 (the oldest in that chunk) to the END of Page 2.
   * This shift changes the `firstTxHash` (our cache key) for every page, causing a "Cold Cache"
   * cascade. The system self-heals by fetching fresh pages and updating the links.
   */
  async getPaginatedHistory(
    address: string,
    offset: number,
    limit: number
  ): Promise<PaginatedHistoryResponse> {
    const allHashes: string[] = [];
    let currentPageToken: string | undefined = undefined;
    let pageNumber = 0;
    let previousPageCacheKey: string | undefined = undefined;

    // Fetch pages until we have enough hashes
    while (allHashes.length < offset + limit) {
      let pageData: CachedPage | undefined;

      if (pageNumber === 0) {
        pageData = await this.fetchFirstPage(address);
      } else {
        pageData = await this.fetchSubsequentPage(
          address,
          pageNumber,
          currentPageToken,
          previousPageCacheKey
        );
      }

      if (!pageData) break;

      // Add hashes from this page
      const hashes = pageData.result.map((tx) => tx.tx_hash);
      allHashes.push(...hashes);

      // Update link from previous page to this page
      const currentFirstTxHash = pageData.result[0]?.tx_hash;
      if (previousPageCacheKey && currentFirstTxHash) {
        paginationCacheService.updateNextPageLink(
          address,
          previousPageCacheKey,
          currentFirstTxHash
        );
      }

      // Update previousPageCacheKey for next iteration
      if (currentFirstTxHash) {
        previousPageCacheKey = currentFirstTxHash;
      }

      console.log(
        `Collected ${allHashes.length} hashes so far (need ${offset + limit})`
      );

      // Stop if no more pages
      if (!pageData.nextPageToken) {
        console.log("No more pages available");
        break;
      }

      currentPageToken = pageData.nextPageToken;
      pageNumber++;
    }

    return this.prepareResponse(address, offset, limit, allHashes);
  }

  private async fetchFirstPage(address: string): Promise<CachedPage | undefined> {
    console.log(`Fetching first page for ${address} (fresh)`);
    const response = await fetchTransactionHashes(address, undefined);

    if (!response) {
      console.log("No response from first page");
      return undefined;
    }

    return {
      result: response.result,
      nextPageToken: response.nextPageToken,
    };
  }

  private async fetchSubsequentPage(
    address: string,
    pageNumber: number,
    currentToken: string | undefined,
    previousPageCacheKey: string | undefined
  ): Promise<CachedPage | undefined> {
    // Try to find the next page key from the previous page's cache link
    if (previousPageCacheKey) {
      const prevCached = paginationCacheService.getCachedPage(
        address,
        previousPageCacheKey
      );
      if (prevCached?.nextPageKey) {
        const cached = paginationCacheService.getCachedPage(
          address,
          prevCached.nextPageKey
        );
        if (cached) {
          console.log(
            `Linked Cache HIT for: ${prevCached.nextPageKey.substring(
              0,
              16
            )}...`
          );
          return cached;
        }
      }
    }

    // Fetch from API
    console.log(`Fetching page ${pageNumber} with token`);
    const response = await fetchTransactionHashes(address, currentToken);

    if (!response) {
      console.log(`No response for page ${pageNumber}`);
      return undefined;
    }

    const firstTxHash = response.result[0]?.tx_hash;
    const pageData: CachedPage = {
      result: response.result,
      nextPageToken: response.nextPageToken,
    };

    if (firstTxHash) {
      const cached = paginationCacheService.getCachedPage(address, firstTxHash);

      if (cached) {
        console.log(
          `Cache HIT for first_tx: ${firstTxHash.substring(0, 16)}...`
        );
        return cached;
      } else {
        console.log(
          `Cache MISS for first_tx: ${firstTxHash.substring(
            0,
            16
          )}..., caching now`
        );
        paginationCacheService.cachePage(address, firstTxHash, pageData);
      }
    }

    return pageData;
  }

  private async prepareResponse(
    address: string,
    offset: number,
    limit: number,
    allHashes: string[]
  ): Promise<PaginatedHistoryResponse> {
    // Extract requested slice
    const requestedHashes = allHashes.slice(offset, offset + limit);

    if (requestedHashes.length === 0) {
      return {
        address,
        offset,
        limit,
        hasMore: false,
        transactions: [],
      };
    }

    const allTransactions = await this.fetchBulkDetails(requestedHashes);

    return {
      address,
      offset,
      limit,
      hasMore: allHashes.length > offset + limit,
      transactions: allTransactions.sort((a,b) => b.time - a.time),
    };
  }

  private async fetchBulkDetails(hashes: string[]): Promise<any[]> {
    const BULK_TX_LIMIT = WHATSONCHAIN_API.BULK_TX_LIMIT;
    const allTransactions: any[] = [];

    for (let i = 0; i < hashes.length; i += BULK_TX_LIMIT) {
      const chunk = hashes.slice(i, i + BULK_TX_LIMIT);
      const chunkTransactions = await fetchBulkTransactionDetails(chunk);
      if (chunkTransactions) {
        allTransactions.push(...chunkTransactions);
      }
    }

    return allTransactions;
  }
}

export const transactionService = new TransactionService();
