import db from './db.service';

export interface CachedPage {
  result: Array<{ tx_hash: string; height: number }>;
  nextPageToken?: string;
  nextPageKey?: string; // Link to the next page cache key (first tx hash of next page)
}

export class PaginationCacheService {
  /**
   * Build cache key using first tx_hash from the page
   * This ensures immutable cache - when new tx appear, first hash changes
   */
  private buildCacheKey(address: string, firstTxHash: string): string {
    return `address:${address}:first:${firstTxHash}`;
  }

  /**
   * Get cached page by address and first tx_hash
   */
  getCachedPage(address: string, firstTxHash: string): CachedPage | null {
    const cacheKey = this.buildCacheKey(address, firstTxHash);
    
    const stmt = db.prepare('SELECT response_data FROM cached_pages WHERE cache_key = ?');
    const row = stmt.get(cacheKey) as { response_data: string } | undefined;
    
    if (!row) return null;
    
    return JSON.parse(row.response_data) as CachedPage;
  }

  /**
   * Cache a page response using first tx_hash as key
   */
  cachePage(address: string, firstTxHash: string, data: CachedPage): void {
    const cacheKey = this.buildCacheKey(address, firstTxHash);
    const responseData = JSON.stringify(data);
    const createdAt = Date.now();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cached_pages (cache_key, response_data, created_at)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(cacheKey, responseData, createdAt);
  }

  /**
   * Update the link to the next page for a given cache key
   */
  updateNextPageLink(address: string, currentFirstTxHash: string, nextFirstTxHash: string): void {
    const cacheKey = this.buildCacheKey(address, currentFirstTxHash);
    
    // First get existing data to preserve other fields
    const stmtGet = db.prepare('SELECT response_data FROM cached_pages WHERE cache_key = ?');
    const row = stmtGet.get(cacheKey) as { response_data: string } | undefined;
    
    if (!row) return; // Can't update if doesn't exist
    
    const data = JSON.parse(row.response_data) as CachedPage;
    
    // Only update if changed
    if (data.nextPageKey !== nextFirstTxHash) {
      data.nextPageKey = nextFirstTxHash;
      
      const stmtUpdate = db.prepare('UPDATE cached_pages SET response_data = ? WHERE cache_key = ?');
      stmtUpdate.run(JSON.stringify(data), cacheKey);
    }
  }

  /**
   * Get cache statistics for an address
   */
  getCacheStats(address: string): { totalPages: number; oldestPage: number | null } {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count, MIN(created_at) as oldest
      FROM cached_pages
      WHERE cache_key LIKE ?
    `);
    
    const result = stmt.get(`address:${address}:%`) as { count: number; oldest: number | null };
    
    return {
      totalPages: result.count,
      oldestPage: result.oldest
    };
  }
}

export const paginationCacheService = new PaginationCacheService();
