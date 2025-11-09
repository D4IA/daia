import type { Transaction } from "#types/transaction.d.ts";

export const createTransaction = (hash: string): Transaction => {
  return {
    blockhash: hash,
    blockheight: 100,
    blocktime: 0,
    confirmations: 10,
    hash: hash,
    locktime: 0,
    size: 250,
    time: 0,
    txid: hash,
    version: 1,
    vin: [],
    vout: [],
  };
};
