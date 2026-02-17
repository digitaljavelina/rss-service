---
phase: 03-feed-management
plan: "02"
subsystem: ui
tags: [express, typescript, vanilla-js, supabase, cheerio, auto-detection, crud]

# Dependency graph
requires:
  - phase: 03-01
    provides: Feed dashboard with list, refresh, delete - edit links already present pointing to /feeds/:slug/edit
  - phase: 02-05
    provides: PUT endpoint pattern, autoExtractItems, parseDate, invalidateFeed, fetchPage services
provides:
  - PUT /api/feeds/:id endpoint with name, url, itemLimit update support
  - URL-change triggers auto-re-detection of selectors and re-fetching of items
  - editFeed page template with editable URL field, RSS URL display with copy button
  - /feeds/:slug/edit UI route
  - public/js/edit-feed.js IIFE with full form load/validate/save cycle
affects:
  - 03-03-delete (edit page links to dashboard)
  - 03-04-view (slug/edit URL pattern established)
  - 04-advanced-extraction (selector editing may extend this form)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse autoExtractItems + fetchPage for URL change re-detection in PUT endpoint"
    - "IIFE vanilla JS with loadFeed() on DOMContentLoaded pattern (matches create-feed.js)"
    - "Slug extracted from window.location.pathname for slug-based API calls"
    - "originalUrl tracking to detect URL changes client-side before PUT"

key-files:
  created:
    - public/js/edit-feed.js
  modified:
    - src/routes/api/feeds.ts
    - src/templates.ts
    - src/routes/ui.ts

key-decisions:
  - "Clear and re-fetch items on URL change rather than merging - ensures clean state with new selectors"
  - "urlChanged flag returned from PUT so client can show specific success message"
  - "Feed URL display is readonly input (not text) for consistent styling and easy copy selection"

patterns-established:
  - "PUT endpoint pattern: find by id-or-slug, validate, conditional re-detection, update, invalidate cache"
  - "Edit page JS: loadFeed() populates form, save handler validates then PUTs, tracks originalUrl"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 3 Plan 02: Feed Edit Summary

**PUT /api/feeds/:id with URL-change re-detection, editFeed template, /feeds/:slug/edit route, and edit-feed.js IIFE form handler**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T14:47:59Z
- **Completed:** 2026-02-17T14:50:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- PUT endpoint with full validation (name 1-100 chars, valid URL, itemLimit 1-1000)
- Automatic selector re-detection when URL changes, with item clear-and-refetch
- Edit page template with editable URL field, readonly RSS URL with copy button
- edit-feed.js (240 lines) with loadFeed, validateForm, showError, showSuccess, setLoading helpers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PUT endpoint and edit page template** - `67607fd` (feat)
2. **Task 2: Create edit-feed.js with form handling** - `321aef5` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/routes/api/feeds.ts` - Added PUT /:id endpoint (~130 lines); re-uses existing fetchPage/autoExtractItems for URL changes
- `src/templates.ts` - Added editFeed page template with form fields, error/success alerts, copy button, script tag
- `src/routes/ui.ts` - Added GET /feeds/:slug/edit route serving editFeed page
- `public/js/edit-feed.js` - Created IIFE edit form handler (240 lines)

## Decisions Made
- **Clear items on URL change:** When a URL changes, existing items are deleted and re-fetched fresh with new selectors. This avoids stale items from the old URL persisting, which could confuse deduplication.
- **urlChanged flag in response:** Backend returns `urlChanged: true` so client can show a more informative success message without the client needing to compare URLs itself.
- **Readonly RSS URL field:** Using a readonly `<input>` rather than a `<div>` for the RSS feed URL display provides consistent styling and lets users triple-click to select the entire URL before the copy button works.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Edit functionality complete; dashboard already links to /feeds/:slug/edit (plan 03-01)
- Feed deletion (03-03) and feed view page (03-04) can build on same patterns
- URL editing sets the stage for advanced extraction (Phase 4) where selectors might be manually adjustable

---
*Phase: 03-feed-management*
*Completed: 2026-02-17*
