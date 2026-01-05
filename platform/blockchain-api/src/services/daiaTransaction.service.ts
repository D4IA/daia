import { transactionFetcher } from "./transactionFetcher.service";
import { DaiaInnerOfferContentSchema, DaiaTransactionDataSchema, DaiaTransactionDataType } from "@d4ia/core";
import db from './db.service';
import { WHATSONCHAIN_API } from "../constants/externalApi.const";


export interface DaiaTransaction {
  txId: string;
  agreements: {
    agreement: {
      offerContentSerialized: string;
      proofs: Record<string, any>; // Plain object instead of Map
    };
    offerContent: {
      naturalLanguageOfferContent: string;
      requirements: Record<string, any>; // Plain object instead of Map
    };
    vout: number;
  }[];
  timestamp: number;
}

export class DaiaTransactionService {
  /**
   * Fetches DAIA transaction history with caching.
   * 
   * Strategy: "Sync to depth with txId classification cache"
   * 1. Fetch tx hashes (limit=1000)
   * 2. For each txId, check classification cache:
   *    - is_daia = true → count as DAIA (data already in daia_transactions)
   *    - is_daia = false → skip
   *    - unknown → fetch full tx, classify, save to both caches
   * 3. Continue until daiaCount >= offset + limit
   * 4. Serve from cache using SQL
   */
  async getDaiaHistory(address: string, offset: number, limit: number) {
    const needed = offset + limit;
    let daiaCount = 0;
    let pageToken: string | undefined;

    while (daiaCount < needed) {
      // 1. Fetch tx hashes (limit=1000)
      const page = await transactionFetcher.fetchTransactionHashes(address, { limit: 1000, pageToken });
      
      if (!page || page.result.length === 0) {
        console.log("No more transaction hashes available");
        break;
      }

      console.log(`Fetched ${page.result.length} tx hashes, processing...`);

      // 2. Partition: known vs unknown
      const unknown: string[] = [];
      
      for (const { tx_hash } of page.result) {
        const classification = this.getClassification(tx_hash);
        
        if (classification === null) {
          // Unknown - need to fetch and classify
          unknown.push(tx_hash);
        } else if (classification === true) {
          // Known DAIA transaction
          daiaCount++;
        }
        // classification === false → skip, don't count
      }

      console.log(`Known DAIA so far: ${daiaCount}, Unknown to fetch: ${unknown.length}`);

      // 3. Bulk fetch unknown transactions
      if (unknown.length > 0) {
        const newDaiaCount = await this.fetchAndClassifyTransactions(unknown, address);
        daiaCount += newDaiaCount;
        console.log(`Classified ${unknown.length} txs, found ${newDaiaCount} new DAIA. Total DAIA: ${daiaCount}`);
      }

      // Check if we have enough
      if (daiaCount >= needed) {
        console.log(`Reached needed count (${needed}), stopping sync`);
        break;
      }

      // Check for more pages
      if (!page.nextPageToken) {
        console.log("No more pages available");
        break;
      }

      pageToken = page.nextPageToken;
    }

    // 4. Serve from cache
    return this.queryCache(address, offset, limit);
  }

  /**
   * Fetches and classifies transactions in bulk.
   * Returns the count of new DAIA transactions found.
   */
  private async fetchAndClassifyTransactions(txIds: string[], address: string): Promise<number> {
    let newDaiaCount = 0;
    const BULK_LIMIT = WHATSONCHAIN_API.BULK_TX_LIMIT;

    // Fetch in chunks to respect API limits
    for (let i = 0; i < txIds.length; i += BULK_LIMIT) {
      const chunk = txIds.slice(i, i + BULK_LIMIT);
      const transactions = await transactionFetcher.fetchBulkTransactionDetails(chunk);

      for (const tx of transactions) {
        const daiaData = this.extractDaiaData(tx);
        const isDaia = daiaData !== null;

        // Save classification
        this.saveClassification(tx.txid, isDaia);

        if (isDaia) {
          // Save DAIA transaction data
          this.saveDaiaTransaction(daiaData, address);
          newDaiaCount++;
        }
      }
    }

    return newDaiaCount;
  }

  /**
   * Fetches a single transaction by its ID and extracts DAIA data.
   * @param txId - The transaction ID to fetch
   * @returns DaiaTransaction object or null if not found or not a DAIA transaction
   */
  async getTransactionById(txId: string): Promise<DaiaTransaction | null> {
    // Check cache first
    const cached = this.getDaiaTransactionFromCache(txId);
    if (cached) return cached;

    // Fetch the transaction from the blockchain
    const tx = await transactionFetcher.fetchTransactionById(txId);

    if (!tx) {
      return null;
    }

    // Extract and validate DAIA data
    const daiaData = this.extractDaiaData(tx);

    return daiaData;
  }

  // ==================== Classification Cache ====================

  private getClassification(txId: string): boolean | null {
    const stmt = db.prepare("SELECT is_daia FROM tx_classification WHERE tx_id = ?");
    const row = stmt.get(txId) as { is_daia: number } | undefined;
    
    if (!row) return null;
    return row.is_daia === 1;
  }

  private saveClassification(txId: string, isDaia: boolean): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO tx_classification (tx_id, is_daia, checked_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(txId, isDaia ? 1 : 0, Date.now());
  }

  // ==================== DAIA Transaction Cache ====================

  private getDaiaTransactionFromCache(txId: string): DaiaTransaction | null {
    const stmt = db.prepare("SELECT data FROM daia_transactions WHERE tx_id = ?");
    const row = stmt.get(txId) as { data: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.data);
  }

  private saveDaiaTransaction(tx: DaiaTransaction, address: string): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO daia_transactions (tx_id, address, data, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(tx.txId, address, JSON.stringify(tx), tx.timestamp, Date.now());
  }

  private queryCache(address: string, offset: number, limit: number) {
    // Fetch all transactions for this address ordered by timestamp DESC
    const stmt = db.prepare(`
      SELECT data FROM daia_transactions 
      WHERE address = ? 
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(address) as { data: string }[];
    const transactions: DaiaTransaction[] = rows.map(row => JSON.parse(row.data));

    // Flatten all agreements from all transactions with their transaction context
    const allAgreements: Array<{
      txId: string;
      timestamp: number;
      agreement: {
        offerContentSerialized: string;
        proofs: Record<string, any>;
      };
      offerContent: {
        naturalLanguageOfferContent: string;
        requirements: Record<string, any>;
      };
      vout: number;
    }> = [];

    for (const tx of transactions) {
      for (const agreementData of tx.agreements) {
        allAgreements.push({
          txId: tx.txId,
          timestamp: tx.timestamp,
          ...agreementData
        });
      }
    }

    // Apply offset and limit to the flattened agreements
    const paginatedAgreements = allAgreements.slice(offset, offset + limit);

    // Group paginated agreements back by transaction for response structure
    const transactionsMap = new Map<string, DaiaTransaction>();

    for (const agreement of paginatedAgreements) {
      if (!transactionsMap.has(agreement.txId)) {
        transactionsMap.set(agreement.txId, {
          txId: agreement.txId,
          timestamp: agreement.timestamp,
          agreements: []
        });
      }

      transactionsMap.get(agreement.txId)!.agreements.push({
        agreement: agreement.agreement,
        offerContent: agreement.offerContent,
        vout: agreement.vout
      });
    }

    const paginatedTransactions = Array.from(transactionsMap.values());

    // Check if there are more agreements
    const total = allAgreements.length;
    const hasMore = offset + limit < total;

    return {
      address,
      offset,
      limit,
      hasMore,
      transactions: paginatedTransactions,
      amount: paginatedTransactions.length,
      total
    };
  }

  // ==================== DAIA Data Extraction ====================

  /**
   * Extracts and validates DAIA data from a transaction.
   */
  private extractDaiaData(tx: any): DaiaTransaction | null {
    if (!tx.vout || !Array.isArray(tx.vout)) {
      return null;
    }

    const agreements: {
      agreement: {
        offerContentSerialized: string;
        proofs: Record<string, any>;
      };
      offerContent: {
        naturalLanguageOfferContent: string;
        requirements: Record<string, any>;
      };
      vout: number;
    }[] = [];

    // Iterate over all outputs
    tx.vout.forEach((output: any, index: number) => {
      if (!output.scriptPubKey?.asm?.startsWith("OP_RETURN") || !output.scriptPubKey?.hex) {
        return;
      }

      const hex = output.scriptPubKey.hex;
      const jsonString = this.decodeOpReturnHex(hex);

      if (!jsonString) return;

      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.proofs && typeof parsed.proofs === 'object') {
          parsed.proofs = new Map(Object.entries(parsed.proofs));
        }

        const txData = DaiaTransactionDataSchema.parse(parsed);
        if (txData.type !== DaiaTransactionDataType.AGREEMENT) {
          throw new Error("Not an agreement type");
        }

        const agreement = txData.agreement

        const contentParsed = JSON.parse(agreement.offerContent.inner);

        const offerContent = DaiaInnerOfferContentSchema.parse(contentParsed);

        // Convert Maps back to plain objects for storage/API
        agreements.push({
          agreement: {
            offerContentSerialized: agreement.offerContent.inner,
            proofs: Object.fromEntries(Object.entries(agreement.proofs))
          },
          offerContent: {
            ...offerContent,
            requirements: Object.fromEntries(Object.entries(offerContent.requirements))
          },
          vout: index
        });

      } catch (e) {
        console.error("Invalid DAIA data in this output, skipping it", e);
        // Invalid DAIA data in this output, skip it
      }
    });

    if (agreements.length === 0) {
      return null;
    }


    return {
      txId: tx.txid,
      agreements,
      timestamp: tx.time || Date.now() / 1000,
    };
  }

  private decodeOpReturnHex(hex: string): string | null {
    // Basic parsing of OP_RETURN script
    // We assume standard format: OP_RETURN (0x6a) + PUSHDATA + DATA

    if (!hex.startsWith("6a")) return null;

    let pointer = 2; // Skip 0x6a

    // Check next byte for pushdata opcode
    const pushOp = parseInt(hex.substring(pointer, pointer + 2), 16);
    pointer += 2;

    let dataLength = 0;

    if (pushOp > 0 && pushOp <= 75) {
      // Immediate length
      dataLength = pushOp;
    } else if (pushOp === 76) { // 0x4c
      // Next 1 byte is length
      dataLength = parseInt(hex.substring(pointer, pointer + 2), 16);
      pointer += 2;
    } else if (pushOp === 77) { // 0x4d
      // Next 2 bytes is length (little endian)
      const lenHex = hex.substring(pointer, pointer + 4);
      // Little endian conversion
      dataLength = parseInt(lenHex.match(/../g)!.reverse().join(''), 16);
      pointer += 4;
    } else if (pushOp === 78) { // 0x4e
      // Next 4 bytes is length
      const lenHex = hex.substring(pointer, pointer + 8);
      dataLength = parseInt(lenHex.match(/../g)!.reverse().join(''), 16);
      pointer += 8;
    } else {
      return null; // Unknown or unsupported opcode
    }

    const dataHex = hex.substring(pointer, pointer + dataLength * 2);

    try {
      // Hex to string
      let str = '';
      for (let i = 0; i < dataHex.length; i += 2) {
        str += String.fromCharCode(parseInt(dataHex.substr(i, 2), 16));
      }
      return str;
    } catch (e) {
      return null;
    }
  }
}

export const daiaTransactionService = new DaiaTransactionService();
