import type { IBlockchainAdapter, PaymentVerification } from "./adapters";

/**
 * Network type for WhatsOnChain API
 */
export type WhatsOnChainNetwork = "main" | "test";

/**
 * WhatsOnChain transaction output
 */
interface WhatsOnChainOutput {
  value: number; // in satoshis
  scriptPubKey: {
    addresses?: string[];
    asm?: string;
    hex?: string;
    type?: string;
  };
}

/**
 * WhatsOnChain transaction response
 */
interface WhatsOnChainTransaction {
  txid: string;
  hash: string;
  version: number;
  size: number;
  locktime: number;
  vin: any[];
  vout: WhatsOnChainOutput[];
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

/**
 * Implementation of IBlockchainAdapter using WhatsOnChain API.
 * Supports both mainnet and testnet.
 * 
 * @see https://docs.whatsonchain.com/
 */
export class WhatsOnChainAdapter implements IBlockchainAdapter {
  private readonly baseUrl: string;

  /**
   * @param network - Network to use (main or test)
   */
  constructor(private readonly network: WhatsOnChainNetwork = "main") {
    this.baseUrl = `https://api.whatsonchain.com/v1/bsv/${network}`;
  }

  /**
   * Verify a payment transaction on the blockchain.
   * 
   * @param txId - Transaction ID to verify
   * @returns Payment verification result with first output details
   * 
   * Note: This returns the first output of the transaction.
   * For multi-output transactions, consider enhancing this to check specific outputs.
   */
  async verifyPayment(txId: string): Promise<PaymentVerification> {
    try {
      const tx = await this.getTransaction(txId);

      // Check if transaction exists
      if (!tx || !tx.vout || tx.vout.length === 0) {
        return {
          exists: false,
          recipient: "",
          amount: 0,
          isConfirmed: false,
        };
      }

      // Get the first output (most common case for simple payments)
      // In production, you might want to specify which output to check
      const firstOutput = tx.vout[0];
      const recipient = this.extractRecipient(firstOutput);
      const amount = firstOutput.value;

      // Transaction is confirmed if it has confirmations
      const isConfirmed = (tx.confirmations ?? 0) > 0;

      return {
        exists: true,
        recipient,
        amount,
        isConfirmed,
      };
    } catch (error) {
      // If transaction not found or API error, return not exists
      if (this.isNotFoundError(error)) {
        return {
          exists: false,
          recipient: "",
          amount: 0,
          isConfirmed: false,
        };
      }
      throw error;
    }
  }

  /**
   * Get transaction details from WhatsOnChain API
   */
  private async getTransaction(txId: string): Promise<WhatsOnChainTransaction> {
    const url = `${this.baseUrl}/tx/${txId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `WhatsOnChain API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Extract recipient address from transaction output
   */
  private extractRecipient(output: WhatsOnChainOutput): string {
    if (output.scriptPubKey.addresses && output.scriptPubKey.addresses.length > 0) {
      return output.scriptPubKey.addresses[0];
    }
    // If no address is available, return empty string
    // This can happen with non-standard scripts
    return "";
  }

  /**
   * Check if error is a 404 not found error
   */
  private isNotFoundError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes("404") || error.message.includes("Not Found");
    }
    return false;
  }
}
