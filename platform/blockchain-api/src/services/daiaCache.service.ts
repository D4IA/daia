import db from "./db.service.js";

export interface DaiaAgreementData {
	offerContentSerialized: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	proofs: Record<string, any>;
	naturalLanguageOfferContent: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	requirements: Record<string, any>;
}

export interface CachedDaiaTransaction {
	txId: string;
	agreement: DaiaAgreementData;
	timestamp: number;
}

/**
 * Cache service for DAIA transaction data and classification.
 */
export class DaiaCacheService {
	// ==================== Classification Cache ====================

	getClassification(txId: string): boolean | null {
		const stmt = db.prepare("SELECT is_daia FROM tx_classification WHERE tx_id = ?");
		const row = stmt.get(txId) as { is_daia: number } | undefined;

		if (!row) return null;
		return row.is_daia === 1;
	}

	saveClassification(txId: string, isDaia: boolean): void {
		const stmt = db.prepare(`
      INSERT OR REPLACE INTO tx_classification (tx_id, is_daia, checked_at)
      VALUES (?, ?, ?)
    `);
		stmt.run(txId, isDaia ? 1 : 0, Date.now());
	}

	// ==================== DAIA Transaction Cache ====================

	getDaiaTransaction(txId: string): CachedDaiaTransaction | null {
		const stmt = db.prepare("SELECT data FROM daia_transactions WHERE tx_id = ?");
		const row = stmt.get(txId) as { data: string } | undefined;
		if (!row) return null;
		return JSON.parse(row.data);
	}

	saveDaiaTransaction(tx: CachedDaiaTransaction, address: string): void {
		const stmt = db.prepare(`
      INSERT OR REPLACE INTO daia_transactions (tx_id, address, data, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
		stmt.run(tx.txId, address, JSON.stringify(tx), tx.timestamp, Date.now());
	}

	/**
	 * Query cached DAIA transactions for an address with pagination.
	 */
	queryByAddress(address: string, offset: number, limit: number) {
		const stmt = db.prepare(`
      SELECT data FROM daia_transactions 
      WHERE address = ? 
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

		const rows = stmt.all(address, limit, offset) as { data: string }[];
		const transactions: CachedDaiaTransaction[] = rows.map((row) => JSON.parse(row.data));

		// Check if there are more
		const countStmt = db.prepare("SELECT COUNT(*) as count FROM daia_transactions WHERE address = ?");
		const countRow = countStmt.get(address) as { count: number };
		const total = countRow.count;
		const hasMore = offset + limit < total;

		return {
			transactions,
			hasMore,
			total,
		};
	}
}

export const daiaCacheService = new DaiaCacheService();
