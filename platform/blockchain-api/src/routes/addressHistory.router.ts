import { Router } from "express";
import { fetchTransactionsByUserAddress } from "@d4ia/blockchain-bridge";
import { cacheService } from "../services/cache.service";

export const addressHistoryRouter = Router();

/**
 * GET /address/:address/confirmed/history
 *
 * Retrieves the **confirmed** transaction history for a specific wallet address.
 * Unconfirmed transactions (mempool) are excluded from this history.
 *
 * Response is cached for 60 seconds.
 */
addressHistoryRouter.get(
  "/address/:address/confirmed/history",
  async (req, res) => {
    const address = req.params.address;
    if (!address) {
      return res.status(400).json({ error: "Address parameter is required" });
    }

    const cacheKey = `address_history_${address}`;
    // TODO: Implement better cache invalidation (e.g., invalidate when new transactions are detected for this address).
    const cachedData = cacheService.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    try {
      const txs = await fetchTransactionsByUserAddress(address);
      const responseData = {
        address,
        total: txs.length,
        transactions: txs,
      };

      cacheService.set(cacheKey, responseData, 60); // Cache for 60 seconds

      res.json(responseData);
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to fetch transactions",
        details: err?.message,
      });
    }
  }
);
