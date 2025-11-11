import express from "express";
import { fetchTransactionsByUserAddress } from "@d4ia/blockchain-bridge";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /address/:address/confirmed/history
 */
app.get("/address/:address/confirmed/history", async (req, res) => {
  const address = req.params.address;

  if (!address) {
    return res.status(400).json({ error: "Address parameter is required" });
  }

  try {
    // zakładam że Twoja libka zwraca już *wszystkie* transakcje
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
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
