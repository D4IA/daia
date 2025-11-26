import { Utxo } from "./types";
import { P2PKH } from "@bsv/sdk";

/**
 * Interface for fetching UTXOs for a given address.
 * Allows for different implementations (e.g., WhatsOnChain, mock for testing).
 */
export interface IUtxoFetcher {
  /**
   * Fetch unspent transaction outputs for a given address.
   * @param address - Bitcoin address to fetch UTXOs for
   * @returns Array of UTXOs
   */
  fetchUtxos(address: string): Promise<Utxo[]>;
}

/**
 * WhatsOnChain API UTXO fetcher implementation.
 */
export class WhatsOnChainUtxoFetcher implements IUtxoFetcher {
  private readonly MAINNET_API = "https://api.whatsonchain.com/v1/bsv/main";
  private readonly TESTNET_API = "https://api.whatsonchain.com/v1/bsv/test";
  private readonly network: "mainnet" | "testnet";

  constructor(network: "mainnet" | "testnet" = "mainnet") {
    this.network = network;
  }

  async fetchUtxos(address: string): Promise<Utxo[]> {
    const baseUrl =
      this.network === "mainnet" ? this.MAINNET_API : this.TESTNET_API;
    const url = `${baseUrl}/address/${address}/unspent`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch UTXOs: HTTP ${response.status} - ${errorText}`
        );
      }

      const utxosData = await response.json();

      // Convert WhatsOnChain format to our UTXO format
      const utxos: Utxo[] = utxosData.map((u: any) => ({
        txId: u.tx_hash,
        outputIndex: u.tx_pos,
        satoshis: u.value,
        script: new P2PKH().lock(address).toHex(),
      }));

      return utxos;
    } catch (error) {
      throw new Error(
        `Failed to fetch UTXOs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Mock UTXO fetcher for testing purposes.
 */
export class MockUtxoFetcher implements IUtxoFetcher {
  private utxos: Map<string, Utxo[]> = new Map();

  /**
   * Add mock UTXOs for an address.
   * @param address - Address to add UTXOs for
   * @param utxos - Array of UTXOs to add
   */
  addUtxos(address: string, utxos: Utxo[]): void {
    this.utxos.set(address, utxos);
  }

  async fetchUtxos(address: string): Promise<Utxo[]> {
    return this.utxos.get(address) || [];
  }

  /**
   * Clear all mock UTXOs.
   */
  clear(): void {
    this.utxos.clear();
  }
}
