---
phase: 07-database-abstraction-layer
plan: 01
subsystem: database
tags: [pg, postgres, supabase, adapter, proxy, query-builder]

# Dependency graph
requires: []
provides:
  - "PgAdapter singleton with all 14 Supabase-compatible chainable query patterns"
  - "Environment-dispatched Proxy in db/index.ts routing DATABASE_URL to pg Pool or Supabase JS"
  - "getClient(), isPgMode() exports for downstream schema.ts and migration code"
affects:
  - "07-02 (schema migrations — uses isPgMode() and PgAdapter.getPool())"
  - "All route files (transparent via Proxy — no changes needed)"

# Tech tracking
tech-stack:
  added:
    - "pg@^8.18.0 — pg Pool for parameterized SQL queries"
    - "@types/pg@^8.16.0 — TypeScript types for pg"
  patterns:
    - "Environment-dispatched Proxy: single supabase export routes to pg or Supabase based on DATABASE_URL"
    - "Chainable QueryBuilder: accumulates SQL state, materializes on .single()/.then()"
    - "Singleton PgAdapter: one Pool per process, lazy-initialized on first DATABASE_URL access"
    - "Categorized error normalization: pg error codes mapped to semantic codes (not_found, conflict, etc.)"

key-files:
  created:
    - "src/db/pg-adapter.ts"
  modified:
    - "src/db/index.ts"
    - "package.json"
    - "src/routes/api/settings.ts"

key-decisions:
  - "Proxy dispatches to pg Pool when DATABASE_URL is set, Supabase JS otherwise — zero route changes"
  - "Backend logged at debug level only (not info) — invisible in normal startup output"
  - "All 14 operation shapes implemented exactly from codebase audit — no more, no less"
  - "DB_DEBUG=true logs every SQL query + params via pino at debug level"
  - "pool.on('error') registered immediately to prevent process crash on idle client failure"
  - "QueryBuilder.then() makes builders awaitable — mirrors Supabase JS implicit await behavior"

patterns-established:
  - "QueryBuilder: chainable builder accumulating state (_filters, _values, _operation) materialized at terminal methods"
  - "Error normalization: normalizePgError() maps pg error codes to semantic DbError codes"
  - "PgAdapter.getInstance(): static singleton pattern with DATABASE_URL guard"

requirements-completed:
  - DB-01

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 7 Plan 01: pg Adapter + Environment Dispatch Summary

**Thin pg Pool adapter mirroring Supabase's chainable `.from().select()` API (14 patterns), with DATABASE_URL-based environment dispatch in db/index.ts — zero route or service changes required**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-19T01:24:24Z
- **Completed:** 2026-02-19T01:27:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/db/pg-adapter.ts` (482 lines) with PgAdapter singleton and QueryBuilder class implementing all 14 Supabase-compatible operation shapes
- Rewrote `src/db/index.ts` to export an environment-dispatched Proxy — DATABASE_URL routes to pg Pool, absent routes to Supabase JS client
- Added `getClient()` and `isPgMode()` exports for downstream schema migration code (Plan 02)
- Installed `pg@^8.18.0` and `@types/pg@^8.16.0`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install pg adapter with all 14 Supabase-compatible query patterns** - `0bf5dbd` (feat)
2. **Task 2: Rewrite db/index.ts with environment-dispatched Proxy** - `738f945` (feat)

**Plan metadata:** (committed with SUMMARY.md)

## Files Created/Modified

- `src/db/pg-adapter.ts` — PgAdapter singleton + QueryBuilder implementing all 14 operation shapes; DB_DEBUG logging; pool error handler; categorized error normalization
- `src/db/index.ts` — Environment-dispatched Proxy; exports `supabase`, `getClient()`, `isPgMode()`, `getSupabase()`
- `package.json` — Added `pg@^8.18.0` and `@types/pg@^8.16.0`
- `src/routes/api/settings.ts` — Fixed pre-existing TypeScript error (SENSITIVE_KEYS.has type widening with Express v5 types)

## Decisions Made

- QueryBuilder uses `then()` to be thenable, enabling `await supabase.from('feeds').select('*')` without calling `.single()` explicitly — mirrors Supabase JS behavior
- Upsert `DO UPDATE SET` clause built from all object keys except the conflict column, reusing original `$N` parameter positions
- UPDATE with `.select().single()` detected by `_returning` flag set when `.select()` is called after `.update()` on the same QueryBuilder
- Proxy dispatches at call time (not construction time) enabling lazy initialization of both backends

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript error in settings.ts**
- **Found during:** Task 1 (TypeScript verification after installing pg)
- **Issue:** `SENSITIVE_KEYS.has(key)` in `settings.ts:109` — Express v5 types widen `req.params.key` to `string | string[]` but `Set.has()` requires `string`. Error pre-existed before this plan but blocked clean TypeScript compilation required by plan verification.
- **Fix:** Changed to `SENSITIVE_KEYS.has(String(key))` — safe since Express route params are always strings in practice
- **Files modified:** `src/routes/api/settings.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `0bf5dbd` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed pool.query<T> generic constraint**
- **Found during:** Task 1 (TypeScript compilation of pg-adapter.ts)
- **Issue:** `pool.query<T>()` requires `T extends QueryResultRow` but QueryBuilder generic `T` is unconstrained. Type error prevented compilation.
- **Fix:** Changed to `pool.query<QueryResultRow>()` and cast result rows with `as unknown as T`
- **Files modified:** `src/db/pg-adapter.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `0bf5dbd` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correct TypeScript compilation. No scope creep. The settings.ts fix is strictly additive — `String(key)` is a no-op at runtime since params are always strings.

## Issues Encountered

None beyond the auto-fixed TypeScript type errors above.

## User Setup Required

None — no external service configuration required. DATABASE_URL is read at runtime from environment; no setup needed to use the Supabase path (existing behavior unchanged).

## Next Phase Readiness

- `PgAdapter.getPool()` is ready for schema.ts to use for migrations (Plan 02)
- `isPgMode()` is ready for schema.ts to skip Supabase-path operations
- All 14 query patterns are implemented and TypeScript-verified
- Zero route or service changes — existing Supabase path continues to work
- Plan 02 can proceed immediately: schema migration + Docker init scripts

---
*Phase: 07-database-abstraction-layer*
*Completed: 2026-02-18*
