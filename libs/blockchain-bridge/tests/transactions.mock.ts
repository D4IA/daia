import type { Transaction } from "../types/transaction";

export const GET_CONFIRMED_HISTORY_TRANSACTIONS_BY_ADDRESS_MOCK = {
  address: "mhZL5AvE2ZncDw3JXx9iaDGHQdUE5LDowG",
  script: "SCRIPT",
  result: [
    {
      tx_hash: "1",
      height: 1,
    },
    {
      tx_hash: "2",
      height: 2,
    },
    {
      tx_hash: "3",
      height: 3,
    },
  ],
  nextPageToken: "1",
  error: "",
};

export const GET_BULK_TRANSACTION_DETAILS_CHUNKS = [[]];

export const GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS = (
  txIds: string[]
): Transaction[] => {
  return txIds.map((txId) => ({
    txid: txId,
    version: 1,
    locktime: 0,
    vin: [],
    vout: [],
    blockhash: "0",
    blockheight: 0,
    confirmations: 0,
    time: 0,
    blocktime: 0,
    hash: txId,
    size: 0,
  }));
};
