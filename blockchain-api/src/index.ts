import express from "express";
import { addressHistoryRouter } from "./routes/addressHistory.router";

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

// Handle root route
app.get("/", (req, res) => {
  res.json({
    message: "Blockchain API Server",
    endpoints: {
      health: "/health",
      addressHistory: "/address/:address/confirmed/history",
    },
  });
});

// Handle .well-known requests (for Chrome DevTools and other tools)
app.use((req, res, next) => {
  if (req.path.startsWith("/.well-known/")) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

app.use(addressHistoryRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
