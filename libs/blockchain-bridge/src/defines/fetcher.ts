/**
 * Raw transaction data from blockchain API (WhatsOnChain format).
 */
export interface RawTransaction {
	txid: string;
	hash: string;
	version: number;
	size: number;
	locktime: number;
	vin: RawTransactionInput[];
	vout: RawTransactionOutput[];
	blockhash: string;
	confirmations: number;
	time: number;
	blocktime: number;
	blockheight: number;
}

export interface RawTransactionInput {
	coinbase?: string;
	txid: string;
	vout: number;
	scriptSig: {
		asm: string;
		hex: string;
	};
	sequence: number;
}

export interface RawTransactionOutput {
	value: number;
	n: number;
	scriptPubKey: {
		asm: string;
		hex: string;
		reqSigs: number;
		type: string;
		addresses: string[];
		isTruncated: boolean;
	};
}

/**
 * Short transaction details with hex data.
 */
export interface RawTransactionShortDetails {
	txid: string;
	hex: string;
	blockhash: string;
	blockheight: number;
	blocktime: number;
	confirmations: number;
}

/**
 * Page of transaction hashes for paginated fetching.
 */
export interface TransactionHashPage {
	address: string;
	script: string;
	result: Array<{
		tx_hash: string;
		height: number;
	}>;
	nextPageToken?: string;
	error: string;
}

/**
 * Interface for fetching transactions from the blockchain.
 * Implementations should handle rate limiting and pagination internally.
 */
export interface BlockchainTransactionFetcher {
	/**
	 * Fetches a single transaction by its ID.
	 * @param id Transaction ID (txid)
	 * @returns Transaction data or null if not found
	 */
	fetchTransactionById(id: string): Promise<RawTransaction | null>;

	/**
	 * Fetches all confirmed transactions for a given address.
	 * Handles pagination automatically.
	 * @param address Wallet address
	 * @returns Array of all confirmed transactions
	 */
	fetchTransactionsByAddress(address: string): Promise<RawTransaction[]>;

	/**
	 * Fetches a page of transaction hashes for a given address.
	 * @param address Wallet address
	 * @param params Optional pagination parameters (limit, pageToken)
	 * @returns Page of transaction hashes with optional next page token
	 */
	fetchTransactionHashes(
		address: string,
		params?: { limit?: number; pageToken?: string },
	): Promise<TransactionHashPage | null>;

	/**
	 * Fetches details for multiple transactions by their IDs.
	 * @param txIds Array of transaction IDs
	 * @returns Array of transaction details
	 */
	fetchBulkTransactionDetails(txIds: string[]): Promise<RawTransaction[]>;

	/**
	 * Fetches raw hex data for multiple transactions.
	 * @param txIds Array of transaction IDs
	 * @returns Array of short transaction details with hex
	 */
	fetchBulkRawTransactionData(txIds: string[]): Promise<RawTransactionShortDetails[]>;
}
