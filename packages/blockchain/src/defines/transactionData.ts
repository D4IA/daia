import { BlockchainAddress } from "../bsv";

export type BlockchainTransactionData = {
	/**
	 * Custom data that is stored along with transaction.
	 */
	customData: string | null;

	/**
	 * Payments that this transaction does.
	 */
	payments: {
		[to: BlockchainAddress]: number;
	};
};
