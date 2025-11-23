import express from "express";
import { addressHistoryRouter } from "./routes/addressHistory.router";
import { configureBridge } from "@d4ia/blockchain-bridge";
import dotenv from "dotenv";

dotenv.config();

configureBridge({
  apiKey: process.env.BSV_API_KEY,
  rps: Number(process.env.BSV_RPS) || undefined,
});

const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({
    message: "Blockchain API Server",
  });
});

app.use(addressHistoryRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
