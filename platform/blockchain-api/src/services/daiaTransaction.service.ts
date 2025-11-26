import { transactionService } from "./transaction.service";
import {
  DaiaAgreementSchema,
  DaiaOfferContentSchema,
  type DaiaAgreement,
  type DaiaOfferContent,
} from "../../../../libs/proto/src/types/offer";
import db from './db.service';


export interface DaiaTransaction {
  txId: string;
  agreements: {
    agreement: DaiaAgreement;
    offerContent: DaiaOfferContent;
    vout: number;
  }[];
  timestamp: number;
}

export class DaiaTransactionService {
  /**
   * Fetches transaction history with caching (Incremental Sync).
   * 
   * Strategy:
   * 1. Fetch pages from blockchain (newest to oldest).
   * 2. Filter for DAIA transactions.
   * 3. If a DAIA tx is found in cache:
   *    - We know we have synced up to this point.
   *    - We can link the previous (newer) tx to this one.
   *    - We can stop fetching from blockchain and serve the rest from DB.
   * 4. If not in cache:
   *    - Save to DB.
   *    - Link previous (newer) tx to this one.
   *    - Continue fetching.
   */
  async getDaiaHistory(address: string, offset: number, limit: number) {
    let currentOffset = 0;
    let hasMore = true;
    
    // Keep track of the last processed DAIA tx to update its 'next' pointer
    let previousDaiaTxId: string | null = null;
    
    // We need to sync enough to cover the requested offset + limit
    // OR until we hit the cache (and then we can query DB).
    // But since we don't have a simple "get all from DB" without traversing the list,
    // we might as well traverse.
    
    // Optimization: If offset is 0, we are at the head.
    // If offset > 0, we might need to traverse from head or use a DB query with offset if we trust the cache is contiguous.
    // For now, let's assume we sync first, then query.
    
    let hitCache = false;

    while (hasMore) {
      // 1. Fetch raw history page
      // We use a small internal limit for syncing, or match the requested limit?
      // Matching requested limit is safer for pagination alignment.
      const fetchLimit = 50; 
      const history = await transactionService.getPaginatedHistory(
        address,
        currentOffset,
        fetchLimit
      );

      if (history.transactions.length === 0) {
        hasMore = false;
        break;
      }

      for (const tx of history.transactions) {
        // 2. Check if it's a DAIA tx
        const daiaData = this.extractDaiaData(tx);
        if (!daiaData) continue;

        // 3. Check Cache
        const cached = this.getFromCache(daiaData.txId);

        if (cached) {
            console.log("HIT CACHE FOR DAIA")
          // HIT CACHE!
          // Link previous (newer) tx to this one
          if (previousDaiaTxId) {
            this.updateNextPointer(previousDaiaTxId, daiaData.txId);
          }
          
          hitCache = true;
          hasMore = false; // Stop fetching from blockchain
          break; 
        } else {
            console.log("NOT IN CACHE FOR DAIA")
          // NOT IN CACHE
          // Save to DB
          this.saveToCache(daiaData, address);
          
          // Link previous (newer) tx to this one
          if (previousDaiaTxId) {
            this.updateNextPointer(previousDaiaTxId, daiaData.txId);
          }
          
          previousDaiaTxId = daiaData.txId;
        }
      }

      if (hitCache) break;

      if (!history.hasMore) {
        hasMore = false;
      } else {
        currentOffset += fetchLimit;
      }
    }

    // Now that we (partially) synced, let's fetch the requested page.
    // Since we have a linked list in DB, we can't easily use SQL OFFSET/LIMIT unless we assume strict ordering by created_at or similar.
    // But 'created_at' might not be reliable for blockchain time.
    // Ideally we traverse the linked list from the head (which we don't explicitly store, but we can query by address and sort by something?)
    // Or we just query by address and sort by timestamp desc (if we trust timestamps).
    // The linked list is useful for *syncing* integrity, but for *querying* a page, standard SQL is faster if we have the data.
    
    // Let's use standard SQL query on the cache table for serving the response.
    // We assume the sync process above populated the necessary range.
    // Warning: If we hit cache early (e.g. at tx #5), but user asked for offset 100, we might not have synced enough if the cache was sparse/broken.
    // But the assumption is: if we hit cache, the REST of the chain is there.
    
    return this.queryCache(address, offset, limit);
  }

  private getFromCache(txId: string): DaiaTransaction | null {
    const stmt = db.prepare("SELECT data FROM daia_transactions WHERE tx_id = ?");
    const row = stmt.get(txId) as { data: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.data);
  }

  private saveToCache(tx: DaiaTransaction, address: string) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO daia_transactions (tx_id, address, data, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(tx.txId, address, JSON.stringify(tx), tx.timestamp, Date.now()); 
  }
  
  private updateNextPointer(currentTxId: string, nextTxId: string) {
    const stmt = db.prepare("UPDATE daia_transactions SET next_tx_id = ? WHERE tx_id = ?");
    stmt.run(nextTxId, currentTxId);
  }

  private queryCache(address: string, offset: number, limit: number) {
    const stmt = db.prepare(`
      SELECT data FROM daia_transactions 
      WHERE address = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(address, limit, offset) as { data: string }[];
    const transactions = rows.map(row => JSON.parse(row.data) as DaiaTransaction);

    // Check if there are more
    const countStmt = db.prepare("SELECT COUNT(*) as count FROM daia_transactions WHERE address = ?");
    const result = countStmt.get(address) as { count: number };
    const total = result.count;
    const hasMore = offset + limit < total;

    return {
      address,
      offset,
      limit,
      hasMore,
      transactions
    };
  }

  /**
   * Extracts and validates DAIA data from a transaction.
   */
  private extractDaiaData(tx: any): DaiaTransaction | null {
    if (!tx.vout || !Array.isArray(tx.vout)) {
      return null;
    }

    const agreements: { agreement: DaiaAgreement; offerContent: DaiaOfferContent; vout: number }[] = [];

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

        const agreement = DaiaAgreementSchema.parse(parsed);
        
        const contentParsed = JSON.parse(agreement.offerContentSerialized);
        
        if (contentParsed.requirements && typeof contentParsed.requirements === 'object') {
          contentParsed.requirements = new Map(Object.entries(contentParsed.requirements));
        }

        const offerContent = DaiaOfferContentSchema.parse(contentParsed);

        agreements.push({
          agreement,
          offerContent,
          vout: index
        });

      } catch (e) {
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
