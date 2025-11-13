import { PrivateKey } from "@bsv/sdk";
import {
  TransactionBuilder,
  WhatsOnChainUtxoFetcher,
  WhatsOnChainBroadcaster,
  Network,
  type Utxo,
} from "@d4ia/proto";
import type { DaiaAgreement } from "@d4ia/proto";

export interface BlockchainPublishResult {
  success: boolean;
  txId?: string;
  txHex?: string;
  error?: string;
  usedUtxos?: Utxo[];
  fee?: number;
}

/**
 * Publish a DAIA agreement to the blockchain
 */
export async function publishAgreementToBlockchain(
  agreement: DaiaAgreement,
  privateKey: PrivateKey,
  address: string,
  network: "mainnet" | "testnet" = "testnet"
): Promise<BlockchainPublishResult> {
  try {
    console.log("\n" + "=".repeat(70));
    console.log(" PUBLISHING TO BLOCKCHAIN");
    console.log("=".repeat(70));

    // Serialize agreement
    const agreementData = JSON.stringify({
      offerContentSerialized: agreement.offerContentSerialized,
      proofs: Object.fromEntries(agreement.proofs),
    });

    console.log(`\n Agreement Data:`);
    console.log(`   Size: ${agreementData.length} bytes`);
    console.log(`   First 100 chars: ${agreementData.substring(0, 100)}...`);

    // Fetch UTXOs
    console.log(`\n Fetching UTXOs for address: ${address}`);
    const utxoFetcher = new WhatsOnChainUtxoFetcher(network);
    const allUtxos = await utxoFetcher.fetchUtxos(address);

    if (allUtxos.length === 0) {
      return {
        success: false,
        error: "No UTXOs available. Please fund the address using a testnet faucet.",
      };
    }

    const totalAvailable = allUtxos.reduce((sum, u) => sum + u.satoshis, 0);
    console.log(`   Found ${allUtxos.length} UTXO(s)`);
    console.log(`   Total available: ${totalAvailable} satoshis`);

    // Build transaction with data output
    console.log(`\n Building transaction with OP_RETURN data...`);
    const broadcaster = new WhatsOnChainBroadcaster();
    const builder = new TransactionBuilder(broadcaster);

    // Select UTXOs (use first 2 for simplicity)
    const selectedUtxos = allUtxos.slice(0, Math.min(2, allUtxos.length));
    const selectedTotal = selectedUtxos.reduce((sum, u) => sum + u.satoshis, 0);

    console.log(`   Using ${selectedUtxos.length} UTXO(s) totaling ${selectedTotal} satoshis`);

    // Build transaction with minimal payment (1 satoshi to self) and data
    const result = await builder.buildTransaction(
      privateKey,
      selectedUtxos,
      address, // Send back to self (minimal amount)
      1, // 1 satoshi payment
      agreementData, // Data to embed in OP_RETURN
      address // Change back to self
    );

    console.log(`\n Transaction built successfully!`);
    console.log(`   Transaction ID: ${result.txId}`);
    console.log(`   Transaction Hex (first 100 chars): ${result.txHex.substring(0, 100)}...`);
    console.log(`   Full transaction hex length: ${result.txHex.length} characters`);

    const fee = selectedTotal - 1 - (result.tx.outputs.length > 1 ? result.tx.outputs[result.tx.outputs.length - 1].satoshis || 0 : 0);
    console.log(`   Estimated fee: ${fee} satoshis`);

    // Broadcast to network
    console.log(`\n Broadcasting to ${network}...`);
    const broadcastResult = await result.broadcast(
      network === "testnet" ? Network.TESTNET : Network.MAINNET
    );

    if (broadcastResult.success) {
      console.log(`\n SUCCESS! Transaction broadcast to blockchain`);
      console.log(`   Transaction ID: ${broadcastResult.txId}`);
      console.log(`   View on explorer: https://test.whatsonchain.com/tx/${broadcastResult.txId}`);
    } else {
      console.log(`\n❌ Broadcast failed: ${broadcastResult.error}`);
    }

    console.log("=".repeat(70) + "\n");

    return {
      success: broadcastResult.success,
      txId: broadcastResult.txId,
      txHex: result.txHex,
      error: broadcastResult.error,
      usedUtxos: result.usedUtxos,
      fee,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error publishing to blockchain: ${errorMessage}\n`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
