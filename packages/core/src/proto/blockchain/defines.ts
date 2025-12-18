import { DaiaTransactionData } from "./data";

export type ParsedTransaction = {
	data: DaiaTransactionData | null;
	payments: {
		[to: string]: number;
	};
};
