# Project State: RSS Service

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Create RSS feeds from anything. Point at any URL, auto-detect content patterns, and get a feed you can subscribe to in your reader.
**Current focus:** v1.1 Docker & Self-Hosting — Phase 7: Database Abstraction Layer

---

## Current Position

**Milestone:** v1.1 Docker & Self-Hosting
**Phase:** 7 of 10 (Database Abstraction Layer)
**Plan:** 2 of 2 in current phase (phase complete)
**Status:** Milestone complete
**Last activity:** 2026-02-19 — Phase 7 Plan 02 complete (migration system + Docker init + startup retry)

Progress: [██░░░░░░░░] 20% (v1.1)

---

## Accumulated Context

### Key Decisions

See PROJECT.md Key Decisions table (updated with outcomes at v1.0 milestone).

v1.1 decisions to track:
- DB abstraction must come first — Supabase JS client cannot connect to local PostgreSQL at all
- Keep `supabase` export name in `src/db/index.ts` so zero routes require changes
- Use `node:22-bookworm-slim` (not Alpine — musl libc breaks better-sqlite3)
- Do NOT use `@sparticuz/chromium` in Docker (Lambda-only package); use system Chromium via apt
- `node-cron` 4.2.1 chosen — bundled TS types, no @types/node-cron needed
- 07-01: Thin pg adapter (14 patterns) with Supabase-compatible chainable API; DATABASE_URL dispatches to pg Pool
- 07-01: Backend logged at debug level only; pool.on('error') registered to prevent idle client process crash
- 07-01: QueryBuilder.then() makes builders thenable — mirrors Supabase JS implicit await behavior
- 07-02: initializeDatabase() single entry point — pg runs node-pg-migrate migrations, Supabase pings (schema managed externally)
- 07-02: Exponential backoff: 500ms base, doubles per attempt, 30s max total before throwing user-readable error
- 07-02: Migration dir resolved via fileURLToPath+dirname+join (ESM-safe, works in tsx dev and compiled dist/)
- 07-02: Docker init-scripts are separate file copies (not symlinks) — Docker build context anti-pattern avoidance

### Open Questions

- Chromium version compatibility: `puppeteer-core@24.37.3` expected revision vs Debian Bookworm system Chromium. Test `/usr/bin/chromium --version` during Phase 8; fall back to Google Chrome apt repo if mismatch.
- ~~Supabase query surface area: audit `src/routes/` and `src/db/` before starting Phase 7 to count distinct query patterns~~ — Resolved: 14 distinct operation shapes, all implemented in pg-adapter.ts

### Active Todos

(None)

### Known Blockers

(None)

---

## Session Continuity

**Last Session:** 2026-02-19T01:32:53Z
**Stopped at:** Completed 07-02-PLAN.md (Phase 7 complete)
**Resume file:** .planning/phases/07-database-abstraction-layer/07-02-SUMMARY.md

**Context for Next Session:**
- v1.0 MVP shipped (Vercel + Supabase, production URL: https://rss-service-five.vercel.app/)
- v1.1 adds Docker self-hosting: bundled PostgreSQL, real cron, system Chromium
- Phase 7 COMPLETE: pg adapter (01) + migration system (02) fully operational
- Next: Phase 8 (Docker Infrastructure) — extend docker/docker-compose.yml with app service, Dockerfile, CI build
- docker/docker-compose.yml has postgres:16-bookworm service ready; Phase 8 extends with app service at project root

---

*Last updated: 2026-02-19 (Phase 7 Plan 02 complete — Phase 7 done)*
