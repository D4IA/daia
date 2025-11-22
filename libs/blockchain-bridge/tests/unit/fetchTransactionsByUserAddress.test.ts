import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  fetchTransactionsByUserAddress,
  type TransactionsByUserAddressFetcher,
} from "#src/core/transactions";

import {
  createTxConfirmedHistoryPage,
  TEST_ADDRESS,
} from "#tests/mocks/factories/addressConfirmedHistory";

import { createTransaction } from "#tests/mocks/factories/bulkTransactionDetails";

describe("fetchTransactionsByUserAddress", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns confirmed transactions from multiple pages", async () => {
    const PAGE_1_TRANSACTIONS = [
      createTransaction("1"),
      createTransaction("2"),
    ];
    const PAGE_2_TRANSACTIONS = [
      createTransaction("3"),
      createTransaction("4"),
    ];
    const fetcher: TransactionsByUserAddressFetcher = {
      transactionIdsByAddressFetcher: vi
        .fn()
        .mockResolvedValueOnce(createTxConfirmedHistoryPage(1))
        .mockResolvedValueOnce(
          createTxConfirmedHistoryPage(2, {
            shouldHaveNextPage: true,
            tx_amount: 2,
          })
        )
        .mockResolvedValueOnce(
          createTxConfirmedHistoryPage(4, {
            shouldHaveNextPage: false,
          })
        ),
      bulkTransactionDetailsFetcher: vi
        .fn()
        .mockResolvedValueOnce(PAGE_1_TRANSACTIONS)
        .mockResolvedValueOnce(PAGE_2_TRANSACTIONS),
    };

    const result = await fetchTransactionsByUserAddress(TEST_ADDRESS, fetcher, {
      batchSize: 2,
    });

    const expected = [...PAGE_1_TRANSACTIONS, ...PAGE_2_TRANSACTIONS];
    expect(result).toEqual(expected);
  });

  it("returns transactions when only one page exists", async () => {
    const fetcher: TransactionsByUserAddressFetcher = {
      transactionIdsByAddressFetcher: vi.fn().mockResolvedValueOnce(
        createTxConfirmedHistoryPage(1, {
          shouldHaveNextPage: false,
        })
      ),
      bulkTransactionDetailsFetcher: vi
        .fn()
        .mockResolvedValueOnce([createTransaction("1")]),
    };

    const result = await fetchTransactionsByUserAddress(TEST_ADDRESS, fetcher);

    const expected = [createTransaction("1")];
    expect(result).toEqual(expected);
  });

  it("returns empty array when wallet has no transactions", async () => {
    const emptyPage = createTxConfirmedHistoryPage(0, {
      shouldHaveNextPage: false,
      tx_amount: 0,
    });
    const fetcher: TransactionsByUserAddressFetcher = {
      transactionIdsByAddressFetcher: vi.fn().mockResolvedValueOnce(emptyPage),
      bulkTransactionDetailsFetcher: vi.fn(),
    };

    const result = await fetchTransactionsByUserAddress(TEST_ADDRESS, fetcher);

    expect(result).toEqual([]);
    expect(fetcher.bulkTransactionDetailsFetcher).not.toHaveBeenCalled();
  });
});
