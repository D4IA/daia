import { Transaction } from "@bsv/sdk";
import { DaiaTransactionDataSchema } from "./data";
import { ParsedTransaction } from "./defines";
import { TransactionParserAdapter } from "./parser";

export class BsvTransactionParserAdapter implements TransactionParserAdapter {
	async parseTransaction(transaction: string): Promise<ParsedTransaction> {
		const tx = Transaction.fromHex(transaction);
		const payments: Record<string, number> = {};
		let data: ParsedTransaction["data"] = null;

		for (const out of tx.outputs) {
			const hex = out.lockingScript?.toHex?.() ?? "";
			const recipient = hex.match(/^76a914([0-9a-f]{40})88ac$/i)?.[1];
			if (recipient) payments[recipient] = (payments[recipient] ?? 0) + (out.satoshis ?? 0);
			if (!data && (hex.startsWith("6a") || hex.startsWith("006a"))) {
				const start = hex.startsWith("006a") ? 4 : 2;
				const len = parseInt(hex.substring(start, start + 2), 16);
				const payload = hex.substring(start + 2, start + 2 + len * 2);
				const bytes = new Uint8Array(payload.length / 2);
				for (let i = 0; i < bytes.length; i++)
					bytes[i] = parseInt(payload.substring(i * 2, i * 2 + 2), 16);
				const parsed = (() => {
					try {
						const raw = JSON.parse(new TextDecoder().decode(bytes));
						if (raw?.agreement?.proofs && !(raw.agreement.proofs instanceof Map)) {
							raw.agreement.proofs = new Map(Object.entries(raw.agreement.proofs));
						}
						return raw;
					} catch {
						return null;
					}
				})();
				data = parsed && DaiaTransactionDataSchema.safeParse(parsed).success ? parsed : null;
			}
		}
		return { data, payments };
	}
}
