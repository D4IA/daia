import { throttleFetchJsonOrNull } from "#src/adapters/httpAdapter";
import {
  GET_TRANSACTION_BY_TX_ID,
  GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS,
  GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS,
} from "#src/constants/apiEndpoints.const";
import { TRANSACTIONS_PER_BATCH } from "#src/constants/transactions";
import { chunkArray } from "#src/utils/chunkArray";
import type { Transaction } from "#types/transaction";
import type { WalletConfirmedHistoryTransactions } from "#types/wallet";

/*
 * Fetches a transaction by its transaction ID.
 * @param transactionId - The ID of the transaction to fetch.
 * @returns The transaction object or null if not found.
 */
export const fetchTransactionByIdOrNull = async (transactionId: string) => {
  return await throttleFetchJsonOrNull<Transaction>(
    GET_TRANSACTION_BY_TX_ID(transactionId)
  );
};

export type TransactionsByUserAddressFetcher = {
  transactionIdsByAddressFetcher: (
    ...args: Parameters<typeof GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS>
  ) => Promise<WalletConfirmedHistoryTransactions | null>;
  bulkTransactionDetailsFetcher: (
    txIds: string[]
  ) => Promise<Transaction[] | null>;
};

const defaultFetcher: TransactionsByUserAddressFetcher = {
  transactionIdsByAddressFetcher: (...args) => {
    return throttleFetchJsonOrNull<WalletConfirmedHistoryTransactions>(
      GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS(...args)
    );
  },
  bulkTransactionDetailsFetcher: (txIds: string[]) => {
    return throttleFetchJsonOrNull<Transaction[]>(
      GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS(),
      {
        method: "POST",
        body: JSON.stringify({ txids: txIds }),
      }
    );
  },
};

/*
 * Fetches confirmed transactions for a given user wallet address in WIF format.
 * @param address - The wallet address to fetch transactions for.
 * @param fetcher - Optional custom fetcher functions for fetching transaction IDs and details.
 * @param options - Optional settings, including batchSize for bulk fetching.
 * @returns An array of transaction objects.
 */
export const fetchTransactionsByUserAddress = async (
  address: string,
  fetcher: TransactionsByUserAddressFetcher = defaultFetcher,
  options?: { batchSize?: number }
) => {
  let transactionHashes: string[] = [];

  let pageToken: string | undefined = undefined;
  while (true) {
    const transactions = await fetcher.transactionIdsByAddressFetcher(address, {
      pageToken,
    });

    if (!transactions) return [];

    const localTransactionHashes = transactions.result.map(
      (shortTransaction) => shortTransaction.tx_hash
    );

    transactionHashes = [...transactionHashes, ...localTransactionHashes];

    if (!transactions.nextPageToken) break;
    pageToken = transactions.nextPageToken;
  }

  const chunks = chunkArray(
    transactionHashes,
    options?.batchSize ?? TRANSACTIONS_PER_BATCH
  );
  const bulkTransactionDetails: Transaction[] = [];

  for (const chunk of chunks) {
    const details = await fetcher.bulkTransactionDetailsFetcher(chunk);
    if (details) {
      bulkTransactionDetails.push(...details);
    }
  }

  return bulkTransactionDetails;
};
