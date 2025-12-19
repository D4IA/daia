import { BlockchainTransactionData } from "./transactionData";

export interface ParsedBlockchainTransactionHandle {
	id: string;
	data: BlockchainTransactionData;

	serializedTransaction: () => string;

	isFinalized: boolean;
}

export interface BlockchainTransactionParser {
	/**
	 * Finds blockchain transaction with specified identifier.
	 *
	 * @param id ID of transaction to lookup
	 * @returns null when no such transaction exists, otherwise handle to parsed transaction.
	 */
	findTransactionById: (id: string) => Promise<ParsedBlockchainTransactionHandle | null>;

	/**
	 * Parses transaction as it's encoded in its serialized form.
	 *
	 * @param serializedTransaction Transaction to parse
	 * @returns Handle to parsed transaction.
	 */
	parseTransaction: (serializedTransaction: string) => Promise<ParsedBlockchainTransactionHandle>;
}
