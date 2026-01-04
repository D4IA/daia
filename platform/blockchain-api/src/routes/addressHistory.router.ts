import { Router } from "express";
import { transactionService } from "../services/transaction.service";
import { PAGINATION } from "../constants/pagination.const";
import { HttpError } from "../utils/http-error";
import { clamp } from "../utils/clamp";

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
    
    const limit = clamp(parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MIN_LIMIT, PAGINATION.MAX_LIMIT);

    if (!address) {
      return HttpError.BadRequest(res, "Address parameter is required");
    }

    try {
      const result = await transactionService.getPaginatedHistory(
        address,
        offset,
        limit
      );
      return res.json(result);
    } catch (err: any) {
      console.error("Error fetching paginated history:", err);
      HttpError.InternalServerError(res, "Failed to fetch transaction history");
    }
  }
);
