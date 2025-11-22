import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "cache.db");

export class CacheService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init() {
    this.db
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS response_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `
      )
      .run();
  }

  get<T>(key: string): T | null {
    const stmt = this.db.prepare(
      "SELECT value, expires_at FROM response_cache WHERE key = ?"
    );
    const row = stmt.get(key) as { value: string; expires_at: number } | undefined;

    if (!row) {
      return null;
    }

    if (Date.now() > row.expires_at) {
      this.delete(key);
      return null;
    }

    try {
      return JSON.parse(row.value) as T;
    } catch (e) {
      console.error("Failed to parse cached value", e);
      return null;
    }
  }

  set(key: string, value: any, ttlSeconds: number) {
    const now = Date.now();
    const expiresAt = now + ttlSeconds * 1000;
    const jsonValue = JSON.stringify(value);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO response_cache (key, value, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(key, jsonValue, now, expiresAt);
  }

  delete(key: string) {
    const stmt = this.db.prepare("DELETE FROM response_cache WHERE key = ?");
    stmt.run(key);
  }
}

export const cacheService = new CacheService();
