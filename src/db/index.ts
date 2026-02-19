/**
 * Database client — environment-dispatched Proxy.
 *
 * Setting DATABASE_URL routes all queries to the pg Pool adapter (PgAdapter).
 * Omitting DATABASE_URL routes to the Supabase JS client.
 *
 * All existing imports of `supabase` from this module continue to work unchanged.
 * New exports: getClient(), isPgMode()
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PgAdapter } from './pg-adapter.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// ─── Supabase Path ────────────────────────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
    logger.debug({ supabaseUrl }, 'Database backend: Supabase JS');
  }
  return _supabase;
}

// ─── Environment Dispatch ─────────────────────────────────────────────────────

let _backendLogged = false;

/**
 * Returns the active database client based on environment.
 * - DATABASE_URL set → PgAdapter (pg Pool)
 * - DATABASE_URL absent → Supabase JS client
 */
export function getClient(): PgAdapter | SupabaseClient {
  if (process.env.DATABASE_URL) {
    const adapter = PgAdapter.getInstance();
    if (!_backendLogged) {
      logger.debug('Database backend: pg Pool');
      _backendLogged = true;
    }
    return adapter;
  }
  return getSupabase();
}

/**
 * Returns true when DATABASE_URL is set and the pg Pool adapter is active.
 * Used by schema.ts to decide whether to run migrations.
 */
export function isPgMode(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// ─── Unified Proxy Export ─────────────────────────────────────────────────────

/**
 * Proxy that routes `.from()` calls to whichever backend is active at call time.
 *
 * All existing `import { supabase } from '../db/index.js'` statements continue to
 * work without any changes — the proxy transparently delegates to pg or Supabase.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getClient();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
