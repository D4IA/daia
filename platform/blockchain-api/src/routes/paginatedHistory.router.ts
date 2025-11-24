import { Router } from "express";
import { fetchTransactionHashes, fetchBulkTransactionDetails } from "@d4ia/blockchain-bridge";
import { paginationCacheService } from "../services/paginationCache.service";

export const paginatedHistoryRouter = Router();

/**
 * GET /address/:address/paginated-history?offset=0&limit=20
 *
 * Retrieves paginated **confirmed** transaction history.
 * - First page (no token): always fresh
 * - Pages 2+ (with token): cached forever (immutable)
 * - Prefetches next 3 pages (sliding window)
 */
paginatedHistoryRouter.get(
  "/address/:address/paginated-history",
  async (req, res) => {
    const address = req.params.address;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50

    if (!address) {
      return res.status(400).json({ error: "Address parameter is required" });
    }

    if (limit > 50) {
      return res.status(400).json({ error: "Maximum limit is 50" });
    }

    try {
      // Collect tx hashes needed for offset + limit
      const allHashes: string[] = [];
      let currentPageToken: string | undefined = undefined;
      let pageNumber = 0;

      // Fetch pages until we have enough hashes
      while (allHashes.length < offset + limit) {
        let pageData;

        if (pageNumber === 0) {
          // First page - ALWAYS fetch fresh (never cache)
          console.log(`Fetching first page for ${address} (fresh)`);
          const response = await fetchTransactionHashes(address, undefined);
          
          if (!response) {
            console.log('No response from first page');
            break;
          }
          
          pageData = {
            result: response.result,
            nextPageToken: response.nextPageToken
          };
        } else {
          // Pages 2+ - try cache using first tx_hash as key
          console.log(`Fetching page ${pageNumber} with token`);
          const response = await fetchTransactionHashes(address, currentPageToken);
          
          if (!response) {
            console.log(`No response for page ${pageNumber}`);
            break;
          }

          // Use first tx_hash as cache key
          const firstTxHash = response.result[0]?.tx_hash;
          
          if (firstTxHash) {
            // Check if we already have this exact page cached
            const cached = paginationCacheService.getCachedPage(address, firstTxHash);
            
            if (cached) {
              console.log(`Cache HIT for first_tx: ${firstTxHash.substring(0, 16)}...`);
              pageData = cached;
            } else {
              console.log(`Cache MISS for first_tx: ${firstTxHash.substring(0, 16)}..., caching now`);
              pageData = {
                result: response.result,
                nextPageToken: response.nextPageToken
              };
              
              // Cache using first tx_hash (immutable!)
              paginationCacheService.cachePage(address, firstTxHash, pageData);
            }
          } else {
            // No tx_hash (empty page?)
            pageData = {
              result: response.result,
              nextPageToken: response.nextPageToken
            };
          }
        }

        // Add hashes from this page
        const hashes = pageData.result.map(tx => tx.tx_hash);
        allHashes.push(...hashes);

        console.log(`Collected ${allHashes.length} hashes so far (need ${offset + limit})`);

        // Stop if no more pages
        if (!pageData.nextPageToken) {
          console.log('No more pages available');
          break;
        }

        currentPageToken = pageData.nextPageToken;
        pageNumber++;
      }

      // Extract requested slice
      const requestedHashes = allHashes.slice(offset, offset + limit);

      if (requestedHashes.length === 0) {
        return res.json({
          address,
          offset,
          limit,
          hasMore: false,
          transactions: []
        });
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

      // TODO: Implement sliding window prefetching (3 pages ahead)

      res.json({
        address,
        offset,
        limit,
        hasMore: allHashes.length > offset + limit,
        transactions: allTransactions
      });
    } catch (err: any) {
      console.error('Error fetching paginated history:', err);
      res.status(500).json({
        error: "Failed to fetch transaction history",
        details: err?.message,
      });
    }
  }
);
