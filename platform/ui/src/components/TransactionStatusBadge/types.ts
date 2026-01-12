export const BLOCKCHAIN_TRANSACTION_STATUSES = {
	PUBLISHED: "published",
	PUBLISHING: "publishing",
	FAILED: "failed",
} as const;

export type TransactionStatus = (typeof BLOCKCHAIN_TRANSACTION_STATUSES)[keyof typeof BLOCKCHAIN_TRANSACTION_STATUSES];
