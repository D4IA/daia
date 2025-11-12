import express from "express";
import { addressHistoryRouter } from "./routes/addressHistory.router";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(addressHistoryRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
