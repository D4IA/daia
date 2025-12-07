import {
  fetchTransactionByIdOrNull,
  fetchTransactionsByUserAddress,
  fetchTransactionHashes,
  fetchBulkTransactionDetails,
  broadcastTransaction,
} from "./api/transactions";

import type { Transaction } from "../types/transaction";
import type { WalletConfirmedHistoryTransactions } from "../types/wallet";

import { configureBridge, type BridgeConfig } from "./config";

import {createAndPublishTransaction} from "./services/createAndPublishTransaction"

export {
  /**
   * Fetches a single transaction by its ID.
   * @see {@link fetchTransactionByIdOrNull}
   */
  fetchTransactionByIdOrNull,

  /**
   * Fetches the complete **confirmed** transaction history for a user address.
   *
   * Note: This function **ignores unconfirmed transactions** (mempool).
   * It handles pagination and batching automatically to retrieve the full history.
   *
   * @see {@link fetchTransactionsByUserAddress}
   */
  fetchTransactionsByUserAddress,

  /**
   * Fetches only the transaction hashes for a user address (paginated).
   * @see {@link fetchTransactionHashes}
   */
  fetchTransactionHashes,

  /**
   * Fetches details for a batch of transaction IDs.
   * @see {@link fetchBulkTransactionDetails}
   */
  fetchBulkTransactionDetails,


  /**
   * Configures the library with API keys and rate limits.
   * @see {@link configureBridge}
   */
  configureBridge,

  /**
   * Broadcasts a raw transaction to the BSV network.
   * @see {@link broadcastTransaction}
   */
  broadcastTransaction,

  /**
   * Creates and publishes a transaction.
   * @see {@link createAndPublishTransaction}
   */
  createAndPublishTransaction,

  type Transaction,
  type WalletConfirmedHistoryTransactions,
  type BridgeConfig


  
};
