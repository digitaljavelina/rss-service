import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const dbPath = './data/rss-service.db';

// Ensure data directory exists
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Create database connection
export const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Set busy timeout to 5 seconds
db.pragma('busy_timeout = 5000');

// Log database initialization
console.log('Database initialized:', dbPath);
console.log('Journal mode:', db.pragma('journal_mode', { simple: true }));
console.log('Foreign keys:', db.pragma('foreign_keys', { simple: true }));
