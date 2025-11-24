import { fetchTransactionHashes, fetchBulkTransactionDetails } from "@d4ia/blockchain-bridge";
import { paginationCacheService } from "./paginationCache.service";

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
   */
  async getPaginatedHistory(
    address: string,
    offset: number,
    limit: number
  ): Promise<PaginatedHistoryResponse> {
    // Collect tx hashes needed for offset + limit
    const allHashes: string[] = [];
    let currentPageToken: string | undefined = undefined;
    let pageNumber = 0;

    // Fetch pages until we have enough hashes
    let previousPageCacheKey: string | undefined = undefined;

    while (allHashes.length < offset + limit) {
      let pageData;
      let isFromCache = false;

      if (pageNumber === 0) {
        // First page - ALWAYS fetch fresh (never cache)
        console.log(`Fetching first page for ${address} (fresh)`);
        const response = await fetchTransactionHashes(address, undefined);

        if (!response) {
          console.log("No response from first page");
          break;
        }

        pageData = {
          result: response.result,
          nextPageToken: response.nextPageToken,
        };
      } else {
        // Pages 2+
        // Try to find the next page key from the previous page's cache link
        let nextFirstTxHash: string | undefined = undefined;

        if (previousPageCacheKey) {
          const prevCached = paginationCacheService.getCachedPage(
            address,
            previousPageCacheKey
          );
          if (prevCached?.nextPageKey) {
            nextFirstTxHash = prevCached.nextPageKey;
            console.log(
              `Found link to next page: ${nextFirstTxHash.substring(0, 16)}...`
            );
          }
        }

        // If we have a link, try to load directly from cache
        if (nextFirstTxHash) {
          const cached = paginationCacheService.getCachedPage(
            address,
            nextFirstTxHash
          );
          if (cached) {
            console.log(
              `Linked Cache HIT for: ${nextFirstTxHash.substring(0, 16)}...`
            );
            pageData = cached;
            isFromCache = true;
          }
        }

        // If not found in cache via link, fetch from API
        if (!pageData) {
          console.log(`Fetching page ${pageNumber} with token`);
          const response = await fetchTransactionHashes(
            address,
            currentPageToken
          );

          if (!response) {
            console.log(`No response for page ${pageNumber}`);
            break;
          }

          // Use first tx_hash as cache key
          const firstTxHash = response.result[0]?.tx_hash;

          if (firstTxHash) {
            // Check if we already have this exact page cached (fallback check)
            const cached = paginationCacheService.getCachedPage(
              address,
              firstTxHash
            );

            if (cached) {
              console.log(
                `Cache HIT for first_tx: ${firstTxHash.substring(0, 16)}...`
              );
              pageData = cached;
              isFromCache = true;
            } else {
              console.log(
                `Cache MISS for first_tx: ${firstTxHash.substring(
                  0,
                  16
                )}..., caching now`
              );
              pageData = {
                result: response.result,
                nextPageToken: response.nextPageToken,
              };

              // Cache using first tx_hash (immutable!)
              paginationCacheService.cachePage(address, firstTxHash, pageData);
            }
          } else {
            // No tx_hash (empty page?)
            pageData = {
              result: response.result,
              nextPageToken: response.nextPageToken,
            };
          }
        }
      }

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

    // Fetch transaction details in chunks of 20 (WhatsOnChain limit)
    const BULK_TX_LIMIT = 20;
    const allTransactions: any[] = [];

    for (let i = 0; i < requestedHashes.length; i += BULK_TX_LIMIT) {
      const chunk = requestedHashes.slice(i, i + BULK_TX_LIMIT);
      const chunkTransactions = await fetchBulkTransactionDetails(chunk);
      if (chunkTransactions) {
        allTransactions.push(...chunkTransactions);
      }
    }

    return {
      address,
      offset,
      limit,
      hasMore: allHashes.length > offset + limit,
      transactions: allTransactions,
    };
  }
}

export const transactionService = new TransactionService();
