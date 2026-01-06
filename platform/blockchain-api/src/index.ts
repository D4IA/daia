import "dotenv/config"; // MUST be first - loads .env before other imports
import express from "express";
import { daiaTransactionRouter } from "./routes/daiaTransaction.router.js";
import "./services/db.service.js"; // Initialize database

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

app.get("/health", (_, res) => {
	res.json({ status: "ok" });
});

app.get("/", (_, res) => {
	res.json({
		message: "Blockchain API Server",
	});
});

app.use("/api", daiaTransactionRouter);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
