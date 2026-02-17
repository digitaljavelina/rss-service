---
phase: 02-core-feed-creation
plan: 04
subsystem: api
tags: [refresh, export, xml, rss, atom, feed-management]

# Dependency graph
requires:
  - phase: 02-01
    provides: extraction services (fetchPage, extractItems, parseDate)
  - phase: 02-02
    provides: feed CRUD API (/api/feeds)
  - phase: 02-03
    provides: create feed UI at /create
provides:
  - Manual feed refresh endpoint (POST /api/feeds/:id/refresh)
  - XML export endpoint (GET /api/feeds/:id/export)
  - Cache invalidation on refresh
affects: [02-05, feed-management, automation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cache invalidation after content update
    - Content-Disposition for file downloads
    - GUID-based deduplication

key-files:
  created: []
  modified:
    - src/routes/api/feeds.ts

key-decisions:
  - "Combined commit for both endpoints in same file"
  - "Use existing invalidateFeed function from feed-cache.ts"
  - "Content-Disposition attachment header for download behavior"

patterns-established:
  - "Refresh pattern: fetch -> extract -> dedupe -> enforce limit -> invalidate cache"
  - "Export pattern: build XML -> set headers -> send as attachment"

# Metrics
duration: 5min
completed: 2026-02-17
---

# Phase 2 Plan 4: Feed Refresh and Export Summary

**Manual feed refresh endpoint with GUID deduplication and XML export with Content-Disposition attachment header for RSS/Atom download**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-17T05:21:00Z
- **Completed:** 2026-02-17T05:26:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- POST /api/feeds/:id/refresh re-fetches source URL and adds new items
- Deduplicates items using content-based GUID comparison
- Enforces item_limit by removing oldest items when exceeded
- Invalidates feed cache for both slug and ID after refresh
- GET /api/feeds/:id/export returns XML file download
- Supports ?format=atom query parameter for Atom format
- Sets Content-Disposition header for browser download behavior

## Task Commits

Both tasks were committed together (same file, interdependent imports):

1. **Task 1: Add manual refresh endpoint** - `9e322f5` (feat)
2. **Task 2: Add XML export endpoint** - `9e322f5` (feat)

## Files Created/Modified

- `src/routes/api/feeds.ts` - Added 2 new endpoints: POST /:id/refresh and GET /:id/export, imports for invalidateFeed and buildFeed

## Decisions Made

- **Combined commit:** Both endpoints added to same file with shared imports (invalidateFeed, buildFeed), committed together
- **Use existing invalidateFeed:** Function already exists in feed-cache.ts, no new function created
- **Type assertion for params:** Used `req.params.id as string` to satisfy TypeScript strict mode

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript type error with query parameter**
- **Found during:** Task 2 (Export endpoint implementation)
- **Issue:** `req.query.format` returns `string | string[]`, but buildFeed expects `string`
- **Fix:** Added type check: `typeof req.query.format === 'string' ? req.query.format : ''`
- **Files modified:** src/routes/api/feeds.ts
- **Verification:** npm run build succeeds
- **Committed in:** 9e322f5 (combined task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor TypeScript fix required for correctness. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Feed refresh and export endpoints complete
- Cache invalidation working via existing invalidateFeed function
- Ready for 02-05: Feed list UI and remaining phase work

---
*Phase: 02-core-feed-creation*
*Completed: 2026-02-17*
