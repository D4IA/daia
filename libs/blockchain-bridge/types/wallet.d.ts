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

export type Utxo = {
  tx_hash: string;
  tx_pos: number;
  value: number;
  height: number;
};
