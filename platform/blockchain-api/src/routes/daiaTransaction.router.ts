import { Router, Request, Response } from "express";
import { daiaTransactionService } from "../services/daiaTransaction.service";
import { clamp } from "../utils/clamp";
import { PAGINATION } from "../constants/pagination.const";
import { HttpError } from "../utils/http-error";

const router = Router();

router.get("/agreements/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const offset = clamp(
      Number(req.query.offset) || PAGINATION.DEFAULT_OFFSET,
      PAGINATION.MIN_OFFSET,
      Number.MAX_SAFE_INTEGER
    );
    const limit = clamp(
      Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MIN_LIMIT,
      PAGINATION.MAX_LIMIT
    );

    const result = await daiaTransactionService.getDaiaHistory(
      address,
      offset,
      limit
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching DAIA history:", error);
    HttpError.InternalServerError(res, "Failed to fetch DAIA history");
  }
});

export const daiaTransactionRouter = router;
