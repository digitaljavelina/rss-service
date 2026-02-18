---
phase: 05-automation-scheduling
plan: 03
subsystem: ui
tags: [refresh-interval, scheduling, forms, vanilla-js, express, supabase]

# Dependency graph
requires:
  - phase: 05-01-automation-scheduling
    provides: Database scheduling columns (refresh_interval_minutes, next_refresh_at) and FeedRow TypeScript interface

provides:
  - Refresh interval dropdown on create feed page (default: Every hour)
  - Refresh interval dropdown on edit feed page (pre-populated with current value)
  - POST /api/feeds accepts and stores refresh_interval_minutes with calculated next_refresh_at
  - GET /api/feeds/:id returns refreshIntervalMinutes, nextRefreshAt, refreshStatus
  - PUT /api/feeds/:id accepts refresh_interval_minutes and recalculates next_refresh_at
  - calculateNextRefreshAt() helper function in feeds API

affects:
  - 05-04-automation-scheduling (dashboard can show per-feed refresh interval and status)
  - 05-05-automation-scheduling (verification of full scheduling flow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "null = manual only: refresh_interval_minutes NULL means no auto-scheduling"
    - "next_refresh_at calculation: now + interval_minutes * 60 * 1000 at create/update time"
    - "hasOwnProperty check for partial PUT: only update interval if key present in body"

key-files:
  created: []
  modified:
    - src/templates.ts
    - public/js/create-feed.js
    - public/js/edit-feed.js
    - src/routes/api/feeds.ts

key-decisions:
  - "Default to Every hour (60 min) on create feed form for best UX"
  - "Preserve existing interval in PUT when key absent from body (hasOwnProperty check)"
  - "Return refreshIntervalMinutes in camelCase from API, accept refresh_interval_minutes (snake_case) in request body"

patterns-established:
  - "Refresh interval options: null (Manual), 15, 30, 60, 360, 1440 minutes"
  - "Edit form populates dropdown by converting DB number to string for select value matching"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 5 Plan 3: Refresh Interval UI Summary

**Per-feed refresh interval selector on create/edit forms with API storing interval and calculated next_refresh_at**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T17:46:14Z
- **Completed:** 2026-02-18T17:48:41Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Create feed page has refresh interval dropdown defaulting to Every hour
- Edit feed page has refresh interval dropdown pre-populated from current DB value
- Feeds API (POST/GET/PUT) fully handles refresh_interval_minutes and next_refresh_at

## Task Commits

Each task was committed atomically:

1. **Task 1: Add refresh interval to Create Feed UI** - `4fc3493` (feat)
2. **Task 2: Add refresh interval to Edit Feed UI** - `e702252` (feat)
3. **Task 3: Update feeds API to handle refresh interval** - `e4199d0` (feat)

## Files Created/Modified
- `src/templates.ts` - Added refresh interval dropdown to both create and edit feed page templates
- `public/js/create-feed.js` - Reads dropdown, includes refresh_interval_minutes in POST body, disables on success
- `public/js/edit-feed.js` - Reads refreshIntervalMinutes from API and sets dropdown; includes in PUT body
- `src/routes/api/feeds.ts` - calculateNextRefreshAt() helper; POST stores interval+next_refresh_at; GET /:id returns scheduling fields; PUT updates interval and recalculates next_refresh_at

## Decisions Made
- Default selection "Every hour" on create form: reasonable balance between freshness and server load
- null for "Manual only": consistent with existing DB design from 05-01 (NULL refresh_interval_minutes = manual)
- camelCase in API responses (refreshIntervalMinutes), snake_case in request bodies (refresh_interval_minutes): existing convention in this codebase
- hasOwnProperty check in PUT handler: allows partial updates without accidentally clearing interval

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Feed scheduling UI is complete; users can configure per-feed refresh intervals
- API correctly stores intervals and calculates next_refresh_at for the scheduler
- Plan 05-04 (dashboard with refresh timing display) already had pre-existing commits in repo from an earlier session
- Plan 05-05 (verification) is ready to execute

---
*Phase: 05-automation-scheduling*
*Completed: 2026-02-18*
