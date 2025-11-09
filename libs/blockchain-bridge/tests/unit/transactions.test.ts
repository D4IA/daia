import { describe, it, expect, vi } from "vitest";

import {
  fetchTransactionsByUserAddress,
  type TransactionsByUserAddressFetcher,
} from "#src/core/transactions.ts";

import {
  createTxConfirmedHistoryPage,
  TEST_ADDRESS,
} from "#tests/mocks/factories/addressConfirmedHistory.ts";

import { createTransaction } from "#tests/mocks/factories/bulkTransactionDetails.ts";

const PAGE_1 = createTxConfirmedHistoryPage(1);
const PAGE_2 = createTxConfirmedHistoryPage(2, {
  tx_amount: 2,
});
const PAGE_3 = createTxConfirmedHistoryPage(4, {
  shouldHaveNextPage: false,
});
const PAGE_1_TRANSACTIONS = [createTransaction("1")];
const PAGE_2_TRANSACTIONS = [createTransaction("2"), createTransaction("3")];
const PAGE_3_TRANSACTIONS = [createTransaction("4")];

describe("Transactions module", () => {
  describe("when fetching transactions by user wallet", () => {
    it("should return confirmed transactions for a valid wallet address with multiple pages", async () => {
      const fetcher: TransactionsByUserAddressFetcher = {
        transactionIdsByAddressFetcher: vi
          .fn()
          .mockResolvedValueOnce(PAGE_1)
          .mockResolvedValueOnce(PAGE_2)
          .mockResolvedValueOnce(PAGE_3),
        bulkTransactionDetailsFetcher: vi
          .fn()
          .mockResolvedValueOnce(PAGE_1_TRANSACTIONS)
          .mockResolvedValueOnce(PAGE_2_TRANSACTIONS)
          .mockResolvedValueOnce(PAGE_3_TRANSACTIONS),
      };

      const result = await fetchTransactionsByUserAddress(
        TEST_ADDRESS,
        fetcher
      );

      const expected = [
        ...PAGE_1_TRANSACTIONS,
        ...PAGE_2_TRANSACTIONS,
        ...PAGE_3_TRANSACTIONS,
      ];
      expect(result).toEqual(expected);
    });

    it("should return confirmed transactions for a valid wallet address with a single page", async () => {
      const fetcher: TransactionsByUserAddressFetcher = {
        transactionIdsByAddressFetcher: vi.fn().mockResolvedValueOnce(PAGE_1),
        bulkTransactionDetailsFetcher: vi
          .fn()
          .mockResolvedValueOnce(PAGE_1_TRANSACTIONS),
      };

      const result = await fetchTransactionsByUserAddress(
        TEST_ADDRESS,
        fetcher
      );

      const expected = [...PAGE_1_TRANSACTIONS];
      expect(result).toEqual(expected);
    });

    it("should return an empty array for a wallet address with no transactions", async () => {
      const emptyPage = createTxConfirmedHistoryPage(0, {
        shouldHaveNextPage: false,
        tx_amount: 0,
      });
      const fetcher: TransactionsByUserAddressFetcher = {
        transactionIdsByAddressFetcher: vi
          .fn()
          .mockResolvedValueOnce(emptyPage),
        bulkTransactionDetailsFetcher: vi.fn(),
      };

      const result = await fetchTransactionsByUserAddress(
        TEST_ADDRESS,
        fetcher
      );

      expect(result).toEqual([]);
      expect(fetcher.bulkTransactionDetailsFetcher).not.toHaveBeenCalled();
    });
  });
});
