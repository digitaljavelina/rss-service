import { isPgMode, supabase } from './index.js';
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
  if (isPgMode()) {
    const pool = PgAdapter.getInstance().getPool();
    await pool.query('SELECT 1');
  } else {
    const { error } = await supabase.from('feeds').select('id').limit(1);
    if (error && error.code !== '42P01') {
      // Ignore "table does not exist" — Supabase schema is managed externally
      throw error;
    }
  }
}

// ─── Migration Runner ─────────────────────────────────────────────────────────

async function runMigrationsIfNeeded(): Promise<void> {
  if (!isPgMode()) {
    // Supabase path: schema is managed externally via Supabase Dashboard / SQL Editor
    return;
  }

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
 *
 * pg path: tests connection, then runs pending node-pg-migrate migrations.
 * Supabase path: pings feeds table to verify connectivity (schema managed externally).
 *
 * On success, logs at debug level. On timeout, throws a user-readable error.
 */
export async function initializeDatabase(): Promise<void> {
  const startTime = Date.now();
  let attempt = 0;
  let lastError: unknown;

  while (true) {
    const elapsed = Date.now() - startTime;

    if (elapsed >= MAX_WAIT_MS && attempt > 0) {
      throw new Error(
        'Database unreachable after 30s — check DATABASE_URL or SUPABASE_URL/SUPABASE_ANON_KEY',
      );
    }

    try {
      await testConnection();
      await runMigrationsIfNeeded();

      if (isPgMode()) {
        logger.debug('Database initialized (pg Pool)');
      } else {
        logger.debug('Database initialized (Supabase)');
      }
      return;
    } catch (err) {
      lastError = err;
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
