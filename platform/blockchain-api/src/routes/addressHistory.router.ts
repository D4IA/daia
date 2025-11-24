import { Router } from "express";
import { transactionService } from "../services/transaction.service";
import { PAGINATION } from "../constants/pagination.const";

export const addressHistoryRouter = Router();

/**
 * GET /address/:address/confirmed/history?offset=0&limit=20
 *
 * Retrieves paginated **confirmed** transaction history.
 * - First page (no token): always fresh
 * - Pages 2+ (with token): cached forever (immutable)
 * - Prefetches next 3 pages (sliding window)
 */
addressHistoryRouter.get(
  "/address/:address/confirmed/history",
  async (req, res) => {
    const address = req.params.address;
    const offset = parseInt(req.query.offset as string) || PAGINATION.DEFAULT_OFFSET;
    const limit = Math.min(
      parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    if (!address) {
      return res.status(400).json({ error: "Address parameter is required" });
    }

    if (limit > PAGINATION.MAX_LIMIT) {
      return res.status(400).json({ error: `Maximum limit is ${PAGINATION.MAX_LIMIT}` });
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
