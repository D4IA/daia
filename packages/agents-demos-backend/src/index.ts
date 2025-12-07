import express from "express";
import type { Request, Response, Application, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Application = express();

// Basic middlewares
app.use(express.json({ limit: "50kb" }));

app.get("/", (req: Request, res: Response) => {
	res.send("Hello World");
});

// Simple optional API key middleware: if PROXY_API_KEY is set, require it
function requireApiKey(req: Request, res: Response, next: NextFunction) {
	const expected = process.env["PROXY_API_KEY"];
	if (!expected) return next(); // no key configured -> allow (dev)

	const headerKey = req.header("x-api-key");
	const auth = req.header("authorization");
	const bearer = auth && auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
	const key = headerKey || bearer;
	if (!key || key !== expected) return res.status(401).json({ error: "Unauthorized" });
	return next();
}

// Minimal input validation helper
function isValidMessages(messages: unknown): messages is Array<unknown> {
	return Array.isArray(messages) && messages.length > 0 && messages.length <= 50;
}

app.post("/api/chat", requireApiKey, async (req: Request, res: Response) => {
	const { model, messages, max_tokens } = req.body || {};
	if (!model || !isValidMessages(messages)) {
		return res.status(400).json({ error: "Invalid request: model and messages are required" });
	}

	const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];
	if (!OPENAI_API_KEY) {
		console.error("OPENAI_API_KEY is not set");
		return res.status(500).json({ error: "Server misconfiguration" });
	}

	try {
		const resp = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${OPENAI_API_KEY}`,
			},
			body: JSON.stringify({ model, messages, max_tokens: max_tokens ?? 1024 }),
		});

		const data = await resp.json();
		return res.status(resp.status).json(data);
	} catch (err) {
		console.error("Error proxying to OpenAI:", err);
		return res.status(502).json({ error: "Upstream request failed" });
	}
});

const PORT = process.env["PORT"] ? Number(process.env["PORT"]) : 3000;

if (process.env["NODE_ENV"] !== "test") {
	app.listen(PORT, () => {
		console.log(`Server listening on port ${PORT}`);
	});
}

export default app;
