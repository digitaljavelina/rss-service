---
phase: 07-database-abstraction-layer
plan: 02
subsystem: database
tags: [pg, postgres, migrations, node-pg-migrate, docker, schema, backoff]

# Dependency graph
requires:
  - "07-01 (PgAdapter.getPool() and isPgMode() for migration runner)"
provides:
  - "initializeDatabase() with exponential backoff retry (30s max) and automatic migration on startup"
  - "node-pg-migrate migration runner for pg path — idempotent, tracks applied migrations in pgmigrations table"
  - "src/db/migrations/001_initial_schema.sql — complete PostgreSQL schema (3 tables, 6 indexes)"
  - "docker/init-scripts/001_initial_schema.sql — Docker first-volume auto-init script"
  - "docker/docker-compose.yml — PostgreSQL service with healthcheck and init-scripts volume mount"
affects:
  - "Phase 8 (Docker Infrastructure) — extends docker-compose.yml with app service"
  - "All startup flows — initializeDatabase() now retries instead of failing immediately"

# Tech tracking
tech-stack:
  added:
    - "node-pg-migrate@^8.0.4 — programmatic SQL migration runner tracking applied migrations in pgmigrations table"
  patterns:
    - "Exponential backoff retry: base 500ms, doubles per attempt, capped at 30s total"
    - "Dual-path initialization: pg runs migrations, Supabase pings (schema managed externally)"
    - "fileURLToPath+dirname+join: ESM-safe migration dir resolution works in tsx dev and compiled dist/"
    - "Docker init-scripts: separate copy (not symlink) mounted to /docker-entrypoint-initdb.d/"

key-files:
  created:
    - "src/db/migrations/001_initial_schema.sql"
    - "docker/init-scripts/001_initial_schema.sql"
    - "docker/docker-compose.yml"
  modified:
    - "src/db/schema.ts"
    - "package.json"

key-decisions:
  - "initializeDatabase() is the single entry point for both pg and Supabase paths — branch on isPgMode() internally"
  - "Supabase path: no migrations (managed externally via Supabase Dashboard) — ping only"
  - "pg path: node-pg-migrate runner() runs pending SQL migrations idempotently before serving requests"
  - "Migration dir resolved via fileURLToPath+dirname+join relative to schema.ts (works in tsx and compiled dist/)"
  - "Docker init-scripts file is a separate copy (not symlink) — avoids Docker build context symlink anti-pattern"
  - "docker-compose.yml lives in docker/ for Phase 7; Phase 8 moves/extends to project root with app service"

requirements-completed:
  - DB-01
  - DB-02

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 7 Plan 02: Migration System + Docker Init + Startup Retry Summary

**SQL migration system with node-pg-migrate, Docker PostgreSQL init scripts, and exponential backoff retry in initializeDatabase() — both pg and Supabase paths unified through a single entry point**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T01:30:58Z
- **Completed:** 2026-02-19T01:32:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `src/db/migrations/001_initial_schema.sql` with complete PostgreSQL schema: feeds (14 cols including all Phase 5 scheduling and Phase 6 platform columns), items (8 cols), settings (3 cols), and 6 indexes
- Created `docker/init-scripts/001_initial_schema.sql` — identical schema as a separate file (not symlink) for Docker first-volume auto-init via `/docker-entrypoint-initdb.d/`
- Rewrote `src/db/schema.ts`: `initializeDatabase()` with exponential backoff retry (500ms base, doubles per attempt, 30s total max), pg path runs node-pg-migrate migrations, Supabase path pings feeds table
- Created `docker/docker-compose.yml`: postgres:16-bookworm with healthcheck, named volume, and init-scripts mount
- Installed `node-pg-migrate@^8.0.4`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration SQL, Docker init script, install node-pg-migrate** - `cbe608a` (feat)
2. **Task 2: Rewrite schema.ts with backoff retry, migration runner, add Docker Compose** - `7a7e839` (feat)

**Plan metadata:** (committed with SUMMARY.md)

## Files Created/Modified

- `src/db/migrations/001_initial_schema.sql` — feeds (14 cols), items (8 cols), settings (3 cols), 6 indexes; no RLS; all CREATE TABLE/INDEX IF NOT EXISTS
- `docker/init-scripts/001_initial_schema.sql` — identical schema content with Docker-specific header comment
- `docker/docker-compose.yml` — postgres:16-bookworm service with pg_isready healthcheck (10s start_period, 5s interval, 10 retries), named volume for persistence, init-scripts mounted read-only
- `src/db/schema.ts` — Rewritten with exponential backoff retry loop, testConnection() and runMigrationsIfNeeded() helpers, pino debug logging throughout, no console.log
- `package.json` — Added node-pg-migrate@^8.0.4

## Decisions Made

- Migration directory resolved via `fileURLToPath(import.meta.url)` + `dirname` + `join` — this ESM-safe pattern works in both `tsx` dev mode (where `import.meta.url` is the source .ts file) and compiled `dist/` output
- Supabase error code `42P01` ("table does not exist") is ignored during connection test — schema is managed externally; this avoids false failures on fresh Supabase projects before tables are created
- server.ts required no changes — existing `try/catch` around `initializeDatabase()` already surfaces the 30s timeout error via `logger.error` and `process.exit(1)`

## Deviations from Plan

None — plan executed exactly as written. TypeScript compiled cleanly on first attempt.

## Issues Encountered

None.

## User Setup Required

To use the Docker PostgreSQL service:
```bash
cd docker
docker-compose up -d
# Set DATABASE_URL in .env:
# DATABASE_URL=postgresql://rssuser:rsspassword@localhost:5432/rssservice
```

The app will then auto-run pending migrations on startup and retry connection with exponential backoff.

## Next Phase Readiness

- Phase 7 complete: pg adapter (Plan 01) + migration system (Plan 02) fully operational
- Phase 8 (Docker Infrastructure) can extend `docker/docker-compose.yml` with the app service
- `initializeDatabase()` is production-ready: retries on startup race conditions (DB not yet healthy), applies schema automatically, works identically for both deployment targets (local pg + Supabase)
- No route or service files were modified in either plan — zero breaking changes

---
*Phase: 07-database-abstraction-layer*
*Completed: 2026-02-19*
