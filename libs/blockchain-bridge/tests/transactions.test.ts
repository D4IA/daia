import { describe, it, expect, vi } from "vitest";

import {
  fetchTransactionByIdOrNull,
  fetchTransactionsByUserAddress,
  type TransactionsByUserAddressFetcher,
} from "../src/core/transactions";

import {
  GET_CONFIRMED_HISTORY_TRANSACTIONS_BY_ADDRESS_MOCK,
  GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS,
} from "./transactions.mock";

describe("Transactions module", () => {
  it("should return transaction by transaction ID", async () => {
    const TX_ID =
      "26cf69d1ba38f0dc1f3018fb5b07b5e37020fc49a55aa749ceb7c7f8d09a5cde";

    const transaction = await fetchTransactionByIdOrNull(TX_ID);

    expect(transaction).toHaveProperty("txid", TX_ID);
    expect(transaction).toHaveProperty("hash", TX_ID);
  });

  it("should return null for non-existent transaction ID", async () => {
    const invalidTxId =
      "0000000000000000000000000000000000000000000000000000000000000000";

    const transaction = await fetchTransactionByIdOrNull(invalidTxId);
    expect(transaction).toBeNull();
  });

  describe("when fetching transactions by user wallet", () => {
    it(
      "should return confirmed transactions for a valid wallet address",
      {
        timeout: 10000,
      },
      async () => {
        const fetcher: TransactionsByUserAddressFetcher = {
          transactionIdsByAddressFetcher: (_) => {
            return Promise.resolve(
              GET_CONFIRMED_HISTORY_TRANSACTIONS_BY_ADDRESS_MOCK
            );
          },
          bulkTransactionDetailsFetcher: (txIds: string[]) => {
            return Promise.resolve(
              GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS(txIds)
            );
          },
        };

        const address = "mhZL5AvE2ZncDw3JXx9iaDGHQdUE5LDowG";

        const result = await fetchTransactionsByUserAddress(address, fetcher);
        console.log(result);
      }
    );
  });
});
