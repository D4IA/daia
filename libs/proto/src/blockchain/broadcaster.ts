/**
 * Network type for broadcasting transactions.
 */
export enum Network {
  MAINNET = "mainnet",
  TESTNET = "testnet",
}

/**
 * Result of broadcasting a transaction.
 */
export interface BroadcastResult {
  success: boolean;
  txId?: string;
  error?: string;
}

/**
 * Interface for broadcasting transactions to the blockchain.
 */
export interface ITransactionBroadcaster {
  /**
   * Broadcast a transaction to the network.
   * @param txHex - Transaction in hex format
   * @param network - Target network (mainnet or testnet)
   * @returns Broadcast result with success status and txId
   */
  broadcast(txHex: string, network: Network): Promise<BroadcastResult>;
}

/**
 * WhatsOnChain API broadcaster implementation.
 */
export class WhatsOnChainBroadcaster implements ITransactionBroadcaster {
  private readonly MAINNET_API = "https://api.whatsonchain.com/v1/bsv/main";
  private readonly TESTNET_API = "https://api.whatsonchain.com/v1/bsv/test";

  async broadcast(
    txHex: string,
    network: Network = Network.MAINNET
  ): Promise<BroadcastResult> {
    const baseUrl =
      network === Network.MAINNET ? this.MAINNET_API : this.TESTNET_API;
    const url = `${baseUrl}/tx/raw`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txhex: txHex }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();

      // WhatsOnChain returns the txid as a string on success
      if (typeof result === "string") {
        return {
          success: true,
          txId: result,
        };
      }

      // Check if there's an error in the response
      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        txId: result.txid || result.txId,
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * Mock broadcaster for testing purposes.
 */
export class MockBroadcaster implements ITransactionBroadcaster {
  private broadcastedTxs: Map<string, { txHex: string; network: Network }> =
    new Map();
  private shouldFail = false;
  private failureReason = "Mock broadcast failure";

  /**
   * Configure the mock to fail on next broadcast.
   */
  setFailure(shouldFail: boolean, reason?: string): void {
    this.shouldFail = shouldFail;
    if (reason) {
      this.failureReason = reason;
    }
  }

  async broadcast(txHex: string, network: Network): Promise<BroadcastResult> {
    if (this.shouldFail) {
      return {
        success: false,
        error: this.failureReason,
      };
    }

    // Generate a mock txId based on the hex
    const mockTxId = this.generateMockTxId(txHex);
    this.broadcastedTxs.set(mockTxId, { txHex, network });

    return {
      success: true,
      txId: mockTxId,
    };
  }

  /**
   * Get all broadcasted transactions.
   */
  getBroadcastedTransactions(): Array<{
    txId: string;
    txHex: string;
    network: Network;
  }> {
    return Array.from(this.broadcastedTxs.entries()).map(
      ([txId, { txHex, network }]) => ({
        txId,
        txHex,
        network,
      })
    );
  }

  /**
   * Clear all broadcasted transactions.
   */
  clear(): void {
    this.broadcastedTxs.clear();
    this.shouldFail = false;
  }

  private generateMockTxId(txHex: string): string {
    // Simple hash-like ID generation for testing
    let hash = 0;
    for (let i = 0; i < txHex.length; i++) {
      hash = (hash << 5) - hash + txHex.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, "0");
  }
}
