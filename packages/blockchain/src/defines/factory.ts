import { BlockchainTransactionData } from "./transactionData";

export interface CreatedBlockchainTransactionHandle {
	/**
	 * ID of this transaction
	 */
	id: string;
	data: Readonly<BlockchainTransactionData>;

	serializedTransaction: () => string;

	publish: () => Promise<void>;
}

/**
 * Client capable of making transaction from arbitrary data.
 */
export interface BlockchainTransactionFactory {
	makeTransaction: (data: BlockchainTransactionData) => Promise<CreatedBlockchainTransactionHandle>;
}
