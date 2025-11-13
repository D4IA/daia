import { Network, BroadcastResult, ITransactionBroadcaster } from "./broadcaster";

/**
 * Represents an unspent transaction output (UTXO).
 */
export interface Utxo {
  /**
   * Transaction ID where this UTXO originated
   */
  txId: string;

  /**
   * Output index within the transaction
   */
  outputIndex: number;

  /**
   * Amount in satoshis
   */
  satoshis: number;

  /**
   * Locking script (scriptPubKey) in hex format
   */
  script: string;
}

/**
 * Result of building a transaction.
 */
export interface TransactionBuildResult {
  /**
   * Transaction in hex format, ready to broadcast
   */
  txHex: string;

  /**
   * Transaction ID (hash)
   */
  txId: string;

  /**
   * Raw transaction object for inspection
   */
  tx: any;

  /**
   * UTXOs that were used as inputs in this transaction.
   * These should be marked as spent/invalidated.
   */
  usedUtxos: Utxo[];

  /**
   * Broadcast this transaction to the blockchain.
   * @param network - Target network (mainnet or testnet)
   * @returns Broadcast result with success status
   */
  broadcast(network?: Network): Promise<BroadcastResult>;
}
