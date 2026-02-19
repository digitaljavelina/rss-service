# Project State: RSS Service

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-18)

**Core value:** Create RSS feeds from anything. Point at any URL, auto-detect content patterns, and get a feed you can subscribe to in your reader.
**Current focus:** v1.1 Docker & Self-Hosting — Phase 7: Database Abstraction Layer

---

## Current Position

**Milestone:** v1.1 Docker & Self-Hosting
**Phase:** 7 of 10 (Database Abstraction Layer)
**Plan:** 0 of TBD in current phase
**Status:** Ready to plan
**Last activity:** 2026-02-18 — v1.1 roadmap created (Phases 7-10)

Progress: [░░░░░░░░░░] 0% (v1.1)

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

### Open Questions

- Chromium version compatibility: `puppeteer-core@24.37.3` expected revision vs Debian Bookworm system Chromium. Test `/usr/bin/chromium --version` during Phase 8; fall back to Google Chrome apt repo if mismatch.
- Supabase query surface area: audit `src/routes/` and `src/db/` before starting Phase 7 to count distinct query patterns (`.from().select()`, `.insert()`, `.update()`, `.delete()`, `.upsert()`).

### Active Todos

(None)

### Known Blockers

(None)

---

## Session Continuity

**Last Session:** 2026-02-19T01:03:59.161Z
**Stopped at:** Phase 7 context gathered
**Resume file:** .planning/phases/07-database-abstraction-layer/07-CONTEXT.md

**Context for Next Session:**
- v1.0 MVP shipped (Vercel + Supabase, production URL: https://rss-service-five.vercel.app/)
- v1.1 adds Docker self-hosting: bundled PostgreSQL, real cron, system Chromium
- Phase 7 first: DB abstraction layer is the hard dependency for everything else
- Audit Supabase query patterns in routes before writing any Phase 7 code

---

*Last updated: 2026-02-18 (v1.1 roadmap created)*
