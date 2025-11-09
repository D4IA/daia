export type WalletConfirmedHistoryTransactions = {
  address: string;
  script: string;
  result: Array<{
    tx_hash: string;
    height: number;
  }>;
  nextPageToken?: string;
  error: string;
};
