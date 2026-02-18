---
phase: 05-automation-scheduling
plan: 01
subsystem: database
tags: [supabase, postgresql, typescript, scheduling, migrations]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase database with feeds/items tables and TypeScript types
provides:
  - feeds table extended with refresh_interval_minutes, next_refresh_at, refresh_status, last_refresh_error columns
  - FeedRow TypeScript interface updated to include all scheduling fields
  - REFRESH_INTERVALS constant with predefined interval options
  - Database indexes for efficient scheduling queries (idx_feeds_next_refresh, idx_feeds_refresh_status)
affects:
  - 05-02 (cron job runner needs refresh_status and next_refresh_at)
  - 05-03 (feed settings UI needs REFRESH_INTERVALS and FeedRow.refresh_interval_minutes)
  - 05-04 (API routes update refresh_status and last_refresh_error)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Manual SQL migration via Supabase SQL Editor for schema changes
    - TypeScript const array with label/value pairs for UI options (REFRESH_INTERVALS)

key-files:
  created: []
  modified:
    - src/types/feed.ts
    - src/routes/api/feeds.ts
    - src/services/feed-builder.ts
    - src/db/schema.ts

key-decisions:
  - "Manual SQL migration rather than programmatic migration - Supabase SQL Editor used directly"
  - "refresh_status defaults to idle - safe default for existing rows"
  - "NULL refresh_interval_minutes means manual-only refresh - explicit nullable design"
  - "TIMESTAMPTZ for next_refresh_at - timezone-aware scheduling across regions"

patterns-established:
  - "Schema changes in Supabase via SQL Editor; document SQL in schema.ts comments"
  - "Scheduling columns nullable by default so existing feeds are unaffected"

# Metrics
duration: ~15min (includes human checkpoint for SQL execution)
completed: 2026-02-18
---

# Phase 5 Plan 01: Database Schema for Scheduling Summary

**Supabase feeds table extended with four scheduling columns and database indexes; FeedRow TypeScript interface and REFRESH_INTERVALS constant added to support automated feed refresh scheduling**

## Performance

- **Duration:** ~15 min (includes human checkpoint for SQL execution)
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `refresh_interval_minutes` (INTEGER, nullable), `next_refresh_at` (TIMESTAMPTZ, nullable), `refresh_status` (TEXT, default 'idle'), and `last_refresh_error` (TEXT, nullable) columns to Supabase feeds table
- Created two database indexes for efficient scheduling queries: `idx_feeds_next_refresh` (partial index on non-null next_refresh_at) and `idx_feeds_refresh_status`
- Updated `FeedRow` TypeScript interface to include all four scheduling fields with proper types
- Added `REFRESH_INTERVALS` exported constant with six preset options (manual, 15m, 30m, 1h, 6h, daily)
- Verified columns via live Supabase API query returning correct defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Add scheduling columns to feeds table** - Manual SQL migration (no commit - Supabase SQL Editor operation)
2. **Task 2: Update TypeScript types** - `67014d1` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/types/feed.ts` - FeedRow interface extended with scheduling fields; REFRESH_INTERVALS constant added
- `src/routes/api/feeds.ts` - Updated to reflect new FeedRow shape
- `src/services/feed-builder.ts` - Updated to reflect new FeedRow shape
- `src/db/schema.ts` - SQL comments updated to document Phase 5 scheduling columns

## Decisions Made
- Manual SQL migration via Supabase SQL Editor rather than programmatic migration - simpler for this project, consistent with how the original schema was created
- `refresh_status` defaults to `'idle'` so existing rows require no backfill
- `refresh_interval_minutes` nullable to represent "manual refresh only" with a NULL value (avoids sentinel integers)
- `next_refresh_at` uses TIMESTAMPTZ (timezone-aware) to ensure correct scheduling across server regions

## Deviations from Plan

None - plan executed exactly as written. Task 1 required a human checkpoint (SQL in Supabase SQL Editor) as planned; Task 2 (TypeScript types) committed atomically.

## Issues Encountered

None - schema migration ran without errors, TypeScript compiled cleanly.

## User Setup Required

None - SQL was run manually by user in Supabase SQL Editor as part of the checkpoint flow.

## Next Phase Readiness
- Database schema ready for cron job runner (Plan 05-02)
- TypeScript types in place for API route updates (Plan 05-04)
- REFRESH_INTERVALS constant ready for feed settings UI (Plan 05-03)
- No blockers for remaining Phase 5 plans

---
*Phase: 05-automation-scheduling*
*Completed: 2026-02-18*
