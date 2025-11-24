import { Router } from "express";
import { fetchTransactionsByUserAddress } from "@d4ia/blockchain-bridge";

export const addressHistoryRouter = Router();

/**
 * GET /address/:address/confirmed/history
 */
addressHistoryRouter.get(
  "/address/:address/confirmed/history",
  async (req, res) => {
    const address = req.params.address;
    if (!address) {
      return res.status(400).json({ error: "Address parameter is required" });
    }
    try {
      const txs = await fetchTransactionsByUserAddress(address);
      res.json({
        address,
        total: txs.length,
        transactions: txs,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "Failed to fetch transactions",
        details: err?.message,
      });
    }
  }
);
