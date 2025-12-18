import z from "zod/v3";
import { TransactionFetcherAdapter } from "./parser";

const TxHexSchema = z.string().regex(/^[0-9a-fA-F]+$/);

export class WhatsOnChainFetcherAdapter implements TransactionFetcherAdapter {
	constructor(private readonly network: "main" | "test" = "main") {}

	async fetchTransactionById(id: string): Promise<string | null> {
		return this.fetchFromUrl(`https://api.whatsonchain.com/v1/bsv/${this.network}/tx/${id}/hex`, id);
	}

	async fetchTransactionByUrl(url: string): Promise<string | null> {
		return this.fetchFromUrl(url, url);
	}

	private async fetchFromUrl(url: string, label: string): Promise<string | null> {
		const res = await fetch(url);
		if (res.status === 404) return null;
		if (res.status === 400 || res.status >= 500) {
			throw new Error(`Failed to fetch tx ${label}: ${res.status} ${res.statusText}`);
		}
		if (!res.ok)
			throw new Error(`Unexpected response fetching tx ${label}: ${res.status} ${res.statusText}`);

		const text = (await res.text()).trim();
		const parsed = TxHexSchema.safeParse(text);
		if (!parsed.success) throw new Error(`Invalid transaction hex returned for ${label}`);
		return parsed.data;
	}
}
