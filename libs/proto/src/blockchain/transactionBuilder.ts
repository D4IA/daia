import { Transaction, P2PKH, PrivateKey, Script, ARC } from "@bsv/sdk";
import { Utxo, TransactionBuildResult } from "./types";
import {
  ITransactionBroadcaster,
  WhatsOnChainBroadcaster,
  Network,
  BroadcastResult,
} from "./broadcaster";

/**
 * Error thrown when insufficient UTXOs are available.
 */
export class InsufficientFundsError extends Error {
  constructor(required: number, available: number) {
    super(
      `Insufficient funds: required ${required} satoshis, available ${available} satoshis`
    );
    this.name = "InsufficientFundsError";
  }
}

/**
 * Builder for creating Bitcoin transactions with payment and data outputs.
 * Uses P2PKH (Pay-to-Public-Key-Hash) locking scripts.
 */
export class TransactionBuilder {
  private static readonly DUST_LIMIT = 1;
  private static readonly DEFAULT_FEE_PER_KB = 1; // satoshis per KB
  private broadcaster: ITransactionBroadcaster;

  constructor(broadcaster?: ITransactionBroadcaster) {
    this.broadcaster = broadcaster || new WhatsOnChainBroadcaster();
  }

  /**
   * Create a transaction with a payment output and optional data output.
   *
   * @param privateKey - Private key for signing inputs
   * @param utxos - Available UTXOs for inputs
   * @param recipientAddress - Address to send payment to
   * @param amountSatoshis - Amount to send in satoshis
   * @param data - Optional arbitrary string data to embed in OP_RETURN output
   * @param changeAddress - Optional address for change (defaults to sender's address)
   * @returns Transaction build result with hex, txId, and raw transaction
   * @throws {InsufficientFundsError} When UTXOs don't cover amount + fees
   */
  async buildTransaction(
    privateKey: PrivateKey,
    utxos: Utxo[],
    recipientAddress: string,
    amountSatoshis: number,
    data?: string,
    changeAddress?: string
  ): Promise<TransactionBuildResult> {
    // Validate inputs
    if (amountSatoshis < TransactionBuilder.DUST_LIMIT) {
      throw new Error(
        `Amount must be at least ${TransactionBuilder.DUST_LIMIT} satoshis`
      );
    }

    // Calculate total available
    const totalAvailable = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0);

    // Create transaction
    const tx = new Transaction();

    // Add inputs from UTXOs
    for (const utxo of utxos) {
      // Create a mock source transaction with the output at the correct index
      const outputs: Array<{satoshis: number; lockingScript: Script}> = [];
      // Fill array up to and including the utxo's output index
      for (let i = 0; i <= utxo.outputIndex; i++) {
        if (i === utxo.outputIndex) {
          outputs.push({
            satoshis: utxo.satoshis,
            lockingScript: Script.fromHex(utxo.script),
          });
        } else {
          // Add dummy outputs for indices before the actual UTXO
          outputs.push({
            satoshis: 0,
            lockingScript: Script.fromHex("00"),
          });
        }
      }
      
      tx.addInput({
        sourceTransaction: {
          outputs,
        } as any,
        sourceOutputIndex: utxo.outputIndex,
        sourceTXID: utxo.txId,
        unlockingScriptTemplate: new P2PKH().unlock(privateKey),
      });
    }

    // Add payment output
    tx.addOutput({
      lockingScript: new P2PKH().lock(recipientAddress),
      satoshis: amountSatoshis,
    });

    // Add data output if provided
    if (data && data.length > 0) {
      const dataScript = Script.fromASM(
        `OP_0 OP_RETURN ${Buffer.from(data, "utf8").toString("hex")}`
      );
      tx.addOutput({
        lockingScript: dataScript,
        satoshis: 0,
      });
    }

    // Estimate fee (simplified: 1 sat per byte estimate)
    // Rough estimate: inputs ~150 bytes each, outputs ~34 bytes each, overhead ~10 bytes
    const estimatedSize =
      utxos.length * 150 +
      (data ? 2 : 1) * 34 +
      (data ? Buffer.from(data, "utf8").length : 0) +
      10;
    const estimatedFee = Math.ceil(
      (estimatedSize * TransactionBuilder.DEFAULT_FEE_PER_KB) / 1000
    );

    // Calculate change
    const change = totalAvailable - amountSatoshis - estimatedFee;

    if (change < 0) {
      throw new InsufficientFundsError(
        amountSatoshis + estimatedFee,
        totalAvailable
      );
    }

    // Add change output if significant
    if (change > TransactionBuilder.DUST_LIMIT) {
      const changeAddr = changeAddress || privateKey.toPublicKey().toAddress();
      tx.addOutput({
        lockingScript: new P2PKH().lock(changeAddr),
        satoshis: change,
      });
    }

    // Sign transaction
    await tx.sign();

    // Get transaction hex and ID
    const txHex = tx.toHex();
    const txId = tx.id("hex") as string;

    // Create broadcast function bound to this transaction
    const broadcast = async (
      network: Network = Network.MAINNET
    ): Promise<BroadcastResult> => {
      return this.broadcaster.broadcast(txHex, network);
    };

    return {
      txHex,
      txId,
      tx,
      usedUtxos: utxos,
      broadcast,
    };
  }

  /**
   * Calculate the minimum UTXOs needed for a transaction.
   * Selects UTXOs in order until sufficient funds are available.
   *
   * @param utxos - Available UTXOs
   * @param requiredAmount - Required amount including fees
   * @returns Array of selected UTXOs
   */
  selectUtxos(utxos: Utxo[], requiredAmount: number): Utxo[] {
    const selected: Utxo[] = [];
    let total = 0;

    // Sort UTXOs by size (descending) for efficiency
    const sortedUtxos = [...utxos].sort((a, b) => b.satoshis - a.satoshis);

    for (const utxo of sortedUtxos) {
      selected.push(utxo);
      total += utxo.satoshis;

      if (total >= requiredAmount) {
        break;
      }
    }

    return selected;
  }
}
