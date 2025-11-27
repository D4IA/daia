import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, '../../data/cache.db');

// Initialize database
export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS cached_pages (
    cache_key TEXT PRIMARY KEY,
    response_data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_address 
  ON cached_pages(cache_key) 
  WHERE cache_key LIKE 'address:%';

  CREATE TABLE IF NOT EXISTS response_cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daia_transactions (
    tx_id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    data TEXT NOT NULL,
    next_tx_id TEXT,
    timestamp INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_daia_address ON daia_transactions(address);
`);

console.log('✅ Database initialized:', DB_PATH);

export default db;
