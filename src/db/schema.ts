import { PgAdapter } from './pg-adapter.js';
import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const MAX_WAIT_MS = 30_000;
const BASE_DELAY_MS = 500;

// ─── Connection Test ──────────────────────────────────────────────────────────

async function testConnection(): Promise<void> {
  const pool = PgAdapter.getInstance().getPool();
  await pool.query('SELECT 1');
}

// ─── Migration Runner ─────────────────────────────────────────────────────────

async function runMigrations(): Promise<void> {
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

  await runner({
    databaseUrl: process.env.DATABASE_URL!,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg: string) => logger.debug({ msg }, 'migration'),
  });
}

// ─── Exponential Backoff Retry ────────────────────────────────────────────────

/**
 * Initialize the database with exponential backoff retry (~30 seconds max).
 * Tests connection, then runs pending node-pg-migrate migrations.
 */
export async function initializeDatabase(): Promise<void> {
  const startTime = Date.now();
  let attempt = 0;

  while (true) {
    const elapsed = Date.now() - startTime;

    if (elapsed >= MAX_WAIT_MS && attempt > 0) {
      throw new Error(
        'Database unreachable after 30s — check DATABASE_URL',
      );
    }

    try {
      await testConnection();
      await runMigrations();
      logger.debug('Database initialized (pg Pool)');
      return;
    } catch (err) {
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_WAIT_MS);
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.debug(
        { attempt, delayMs: delay, error: errMsg },
        'Database connection failed, retrying',
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
