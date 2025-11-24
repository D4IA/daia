import { Router } from "express";
import { transactionService } from "../services/transaction.service";

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
      const result = await transactionService.getPaginatedHistory(
        address,
        offset,
        limit
      );
      res.json(result);
    } catch (err: any) {
      console.error("Error fetching paginated history:", err);
      res.status(500).json({
        error: "Failed to fetch transaction history",
        details: err?.message,
      });
    }
  }
);
