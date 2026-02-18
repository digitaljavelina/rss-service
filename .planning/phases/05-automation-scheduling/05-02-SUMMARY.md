---
phase: 05-automation-scheduling
plan: "02"
subsystem: infra
tags: [vercel, cron, supabase, scheduler, typescript, puppeteer]

# Dependency graph
requires:
  - phase: 05-01
    provides: scheduling columns (refresh_interval_minutes, next_refresh_at, refresh_status, last_refresh_error) and indexes
  - phase: 04-advanced-extraction
    provides: fetchPage, fetchPageWithBrowser, autoExtractItems services

provides:
  - Vercel cron job handler at api/cron/scheduler.ts
  - Per-minute feed refresh coordinator
  - Concurrent-safe refresh via refresh_status locking
  - next_refresh_at recalculation after each run

affects:
  - 05-03 (feed settings UI - users need to set refresh_interval_minutes to activate scheduling)
  - 05-04 (API routes for scheduling)
  - 05-05 (verification - cron endpoint is the thing to test)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vercel cron security via Authorization Bearer header check
    - Optimistic locking via refresh_status column (idle -> refreshing -> idle/error)
    - Promise.allSettled for parallel feed processing with partial failure tolerance
    - Dynamic imports for src/ services from api/ layer

key-files:
  created:
    - api/cron/scheduler.ts
  modified:
    - vercel.json
    - .env.example

key-decisions:
  - "CRON_SECRET verified via Authorization header - matches Vercel automatic injection pattern"
  - "MAX_FEEDS_PER_RUN = 5 to stay within 60s serverless timeout"
  - "next_refresh_at updated even on error to prevent tight retry loops"
  - "refresh_status = idle query guard prevents concurrent cron runs processing same feed"
  - "Dynamic imports for src/ services - avoids path resolution issues at Vercel cron layer"

patterns-established:
  - "Cron security: always verify Authorization: Bearer CRON_SECRET header, return 401 if absent or wrong"
  - "Parallel processing: use Promise.allSettled to handle individual feed failures without aborting all feeds"
  - "Status locking: mark as 'refreshing' before work, set 'idle' or 'error' after"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 5 Plan 02: Cron Scheduler Summary

**Vercel cron job that runs every minute, queries due feeds by next_refresh_at, locks with refresh_status, and dispatches parallel refresh operations using existing extraction services**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T17:41:32Z
- **Completed:** 2026-02-18T17:43:30Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `api/cron/scheduler.ts` with full refresh pipeline reusing existing fetchPage/fetchPageWithBrowser/autoExtractItems
- Configured vercel.json with per-minute cron schedule and 1024MB/60s function settings
- Documented CRON_SECRET requirement in .env.example with generation instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cron scheduler endpoint** - `bd18d80` (feat)
2. **Task 2: Configure Vercel cron job** - `9728ffe` (chore)
3. **Task 3: Add CRON_SECRET environment variable** - `04fd41c` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `api/cron/scheduler.ts` - Vercel cron handler: auth check, feed query, status locking, parallel refresh, next_refresh_at update
- `vercel.json` - Added api/cron/scheduler.ts function config and crons array with `* * * * *` schedule
- `.env.example` - Added CRON_SECRET variable with generation instructions

## Decisions Made

- **CRON_SECRET via Authorization header:** Vercel automatically injects the secret as `Authorization: Bearer <CRON_SECRET>` when invoking crons. The handler checks this header and returns 401 for unauthorized requests.
- **MAX_FEEDS_PER_RUN = 5:** Caps feeds per cron invocation to stay within the 60-second serverless timeout. Multiple cron runs per minute naturally spread the load.
- **next_refresh_at updates on error too:** Prevents tight retry loops on persistently failing feeds. The feed will retry after one normal interval.
- **Dynamic imports for src/ services:** The scheduler at `api/cron/` dynamically imports from `../../src/services/` to reuse existing page fetching and extraction logic without duplication.
- **refresh_status locking:** Marks feeds as 'refreshing' before processing begins. If a concurrent cron run queries the same feeds, those already marked 'refreshing' will be skipped by the `eq('refresh_status', 'idle')` filter.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The tsconfig `rootDir: ./src` excludes `api/cron/scheduler.ts` from the standard compile path (same as `api/index.ts`), so Vercel handles compilation for the api layer directly. TypeScript type-checking was confirmed clean with `tsc --noEmit` on both the src/ tree and the scheduler file independently.

## User Setup Required

**CRON_SECRET must be set in Vercel Dashboard before the cron job will work.**

1. Generate a secret: `openssl rand -hex 32`
2. Go to Vercel Dashboard > Project Settings > Environment Variables
3. Add `CRON_SECRET` with the generated value
4. Apply to Production, Preview, and Development environments
5. Redeploy for environment variables to take effect

**Verification:** `curl -H "Authorization: Bearer your_secret" https://rss-service-five.vercel.app/api/cron/scheduler` should return `{"processed":0,"message":"No feeds due for refresh"}` (or feed results if any are due).

## Next Phase Readiness

- Cron job infrastructure is deployed and ready
- Feeds need `refresh_interval_minutes` and `next_refresh_at` set to become eligible for auto-refresh
- Plan 05-03 (feed settings UI) provides the UX for users to configure these values
- Plan 05-04 (API routes for scheduling) may add explicit scheduling endpoints
- CRON_SECRET must be set in Vercel before the cron job will function securely

---
*Phase: 05-automation-scheduling*
*Completed: 2026-02-18*
