import { throttleFetchJsonOrNull } from "@src/adapters/httpAdapter";
import {
  GET_TRANSACTION_BY_TX_ID,
  GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS,
  GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS,
} from "@src/constants/apiEndpoints.const";
import { TRANSACTIONS_PER_BATCH } from "@src/constants/transactions";
import { chunkArray } from "@src/utils/chunkArray";
import type { Transaction } from "@types/transaction";
import type { WalletConfirmedHistoryTransactions } from "@types/wallet";

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

/*
 * Fetches confirmed transactions for a given user wallet address in WIF format.
 * @param address - The wallet address to fetch transactions for.
 * @returns An array of transaction objects.
 */
export const fetchTransactionsByUserAddress = async (address: string) => {
  const transactions =
    await throttleFetchJsonOrNull<WalletConfirmedHistoryTransactions>(
      GET_CONFIRMED_TRANSACTIONS_BY_WALLET_ADDRESS(address)
    );
  if (!transactions) return [];

  const transactionHashes = transactions.result.map(
    (shortTransaction) => shortTransaction.tx_hash
  );

  const chunks = chunkArray(transactionHashes, TRANSACTIONS_PER_BATCH);
  const bulkTransactionDetails: Transaction[] = [];

  for (const chunk of chunks) {
    const details = await throttleFetchJsonOrNull<Transaction[]>(
      GET_BULK_TRANSACTION_DETAILS_BY_TX_IDS(),
      {
        method: "POST",
        body: JSON.stringify({ txids: chunk }),
      }
    );
    if (details) {
      bulkTransactionDetails.push(...details);
    }
  }
  return bulkTransactionDetails;
};
