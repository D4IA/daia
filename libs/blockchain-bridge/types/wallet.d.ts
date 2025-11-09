export type WalletConfirmedHistoryTransactions = {
  address: unknown;
  script: unknown;
  result: Array<{
    tx_hash: string;
    height: number;
  }>;
  error: unknown;
};
