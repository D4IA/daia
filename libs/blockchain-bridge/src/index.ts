import {
  fetchTransactionByIdOrNull,
  fetchTransactionsByUserAddress,
  fetchTransactionHashes,
  fetchBulkTransactionDetails,
  broadcastTransaction,
} from "./core/transactions";
import { fetchAddressBalance } from "./core/wallet";

import type { Transaction } from "../types/transaction";
import type { WalletConfirmedHistoryTransactions } from "../types/wallet";

import { configureBridge, type BridgeConfig } from "./config";

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
   * Fetches the current balance and UTXO script info for an address.
   * @see {@link fetchAddressBalance}
   */
  fetchAddressBalance,

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

  type Transaction,
  type WalletConfirmedHistoryTransactions,
  type BridgeConfig

  
};
