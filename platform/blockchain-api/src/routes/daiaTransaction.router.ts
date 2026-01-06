import { Router, Request, Response } from "express";
import { daiaTransactionService } from "../services/daiaTransaction.service.js";
import { clamp } from "../utils/clamp.js";
import { PAGINATION } from "../constants/pagination.const.js";
import { HttpError } from "../utils/http-error.js";

const router = Router();

router.get("/agreements/address/:address", async (req: Request, res: Response) => {
	try {
		const { address } = req.params;
		const offset = clamp(
			Number(req.query.offset) || PAGINATION.DEFAULT_OFFSET,
			PAGINATION.MIN_OFFSET,
			Number.MAX_SAFE_INTEGER,
		);
		const limit = clamp(
			Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
			PAGINATION.MIN_LIMIT,
			PAGINATION.MAX_LIMIT,
		);

		const result = await daiaTransactionService.getDaiaHistory(address, offset, limit);

		res.json(result);
	} catch (error) {
		console.error("Error fetching DAIA history:", error);
		HttpError.InternalServerError(res, "Failed to fetch DAIA history");
	}
});

router.get("/agreements/tx/:txId", async (req: Request, res: Response) => {
	try {
		const { txId } = req.params;

		const result = await daiaTransactionService.getTransactionById(txId);

		if (!result) {
			return HttpError.NotFound(res, "DAIA agreements not found in transaction");
		}

		res.json(result);
	} catch (error) {
		console.error("Error fetching DAIA agreements:", error);
		HttpError.InternalServerError(res, "Failed to fetch DAIA agreements");
	}
});

export const daiaTransactionRouter = router;
