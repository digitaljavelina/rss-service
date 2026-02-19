---
phase: 05-automation-scheduling
plan: "04"
subsystem: ui
tags: [dashboard, refresh-timing, scheduling, vanilla-js, supabase]

# Dependency graph
requires:
  - phase: 05-01
    provides: scheduling schema columns (refresh_interval_minutes, next_refresh_at, refresh_status, last_refresh_error)
  - phase: 05-02
    provides: cron scheduler that sets refresh_status and next_refresh_at
provides:
  - Dashboard table with Feed Name, Items, Last Updated, Next Refresh, Status, Actions columns
  - GET /api/feeds returns refresh timing fields in response
  - timeAgo() and timeUntil() relative time helpers in dashboard.js
  - Status badges for idle/refreshing/error states with error tooltip
affects: [05-05-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Snake_case API fields (refresh_status, next_refresh_at) passed directly to frontend"
    - "Tooltip via title attribute for error details on hover"
    - "timeAgo/timeUntil relative time helpers as pure functions"

key-files:
  created: []
  modified:
    - src/templates.ts
    - src/routes/api/feeds.ts
    - public/js/dashboard.js

key-decisions:
  - "Updated_at displayed as timeAgo (e.g., '5 min ago') rather than absolute date"
  - "next_refresh_at=null shown as 'Manual' (feed has no auto-schedule)"
  - "next_refresh_at in past shown as 'Pending...' (cron hasn't run yet)"
  - "Error tooltip uses native title attribute (no JS library needed)"
  - "Idle status shown as subtle text rather than badge to reduce visual noise"

patterns-established:
  - "timeAgo/timeUntil: pure functions with no dependencies, reusable across pages"
  - "Status badge factory: single getStatusBadge() function returns correct element per status"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 5 Plan 04: Dashboard Refresh Timing Display Summary

**Dashboard table upgraded with Last Updated (relative), Next Refresh (countdown), and Status (idle/refreshing/error with error tooltip) columns driven by scheduling fields from Supabase**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T17:46:39Z
- **Completed:** 2026-02-18T17:48:27Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Dashboard table headers restructured to logical column order: Feed Name, Items, Last Updated, Next Refresh, Status, Actions
- GET /api/feeds now selects and returns all four scheduling columns (refresh_interval_minutes, next_refresh_at, refresh_status, last_refresh_error)
- Dashboard JS renders relative time for Last Updated ("5 min ago"), countdown for Next Refresh ("in 10 min" / "Manual" / "Pending..."), and status badges with error tooltip on hover

## Task Commits

Each task was committed atomically:

1. **Task 1: Update dashboard table headers** - `3c37418` (feat)
2. **Task 2: Update feeds API response** - `670de03` (feat)
3. **Task 3: Update dashboard JS to render timing** - `a6b8b39` (feat)

## Files Created/Modified

- `src/templates.ts` - Added Next Refresh column header, reordered columns, updated colspan to 6
- `src/routes/api/feeds.ts` - Extended SELECT to include scheduling fields; added them to response mapping
- `public/js/dashboard.js` - Added timeAgo(), timeUntil() helpers; rewrote getStatusBadge() for refresh_status; updated createFeedRow() column order; updated all colspan values to 6

## Decisions Made

- Used `feed.updated_at || feed.updatedAt` fallback in JS to handle both snake_case API field and legacy camelCase - ensures backward compatibility during single-row refresh (GET /:id returns camelCase)
- `timeAgo()` returns em dash (`—`) for null/invalid dates instead of "Never" to visually distinguish "no data" from "never happened"
- Idle status displays as subtle text ("Idle") rather than a green badge to reduce visual clutter - only actionable states (refreshing/error) get badges

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All refresh timing information now visible in dashboard
- Users can see when each feed last updated, when it will refresh next, and its current status
- Error state with tooltip shows what went wrong for failed feeds
- Ready for Plan 05-05: end-to-end verification of the complete scheduling system

---
*Phase: 05-automation-scheduling*
*Completed: 2026-02-18*
