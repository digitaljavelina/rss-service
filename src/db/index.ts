/**
 * Database client — PostgreSQL via pg Pool.
 *
 * PgAdapter mirrors the Supabase JS chainable API (.from().select(), etc.)
 * so all existing query code works without changes.
 *
 * Requires DATABASE_URL in the environment.
 */

import { PgAdapter } from './pg-adapter.js';

// ─── Unified Export ──────────────────────────────────────────────────────────

/**
 * The database client used throughout the app.
 *
 * Named `supabase` for historical reasons — all query code uses
 * supabase.from('table').select(...) syntax which PgAdapter implements.
 * Typed as `any` to preserve the loose return types the codebase expects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = new Proxy({}, {
  get(_, prop) {
    const client = PgAdapter.getInstance();
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function getClient(): PgAdapter {
  return PgAdapter.getInstance();
}
