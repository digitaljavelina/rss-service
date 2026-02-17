---
phase: 03-feed-management
plan: 03
subsystem: ui
tags: [javascript, file-api, blob, filereader, json, export, import, dashboard]

# Dependency graph
requires:
  - phase: 03-feed-management plan 01
    provides: dashboard UI with event delegation and feed table rows
  - phase: 03-feed-management plan 02
    provides: feed edit workflow and API GET /api/feeds/:id returning full config
provides:
  - Export button per feed row that downloads JSON config file via Blob/URL.createObjectURL
  - Import Feed button that opens file picker and creates feed from JSON via FileReader
  - validateFeedConfig() for client-side validation before API call
  - Import success/error messaging in dashboard header
affects:
  - phase 4 and beyond (backup/restore pattern established, portable feed config format)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Blob + URL.createObjectURL for client-side file downloads with immediate revokeObjectURL cleanup
    - FileReader API for reading JSON file uploads without server round-trip
    - Client-side JSON validation before posting to API

key-files:
  created: []
  modified:
    - public/js/dashboard.js
    - src/templates.ts

key-decisions:
  - "Client-side Blob download avoids server endpoint for export (simpler, no Content-Disposition needed)"
  - "Immediate URL.revokeObjectURL after anchor click prevents memory leaks"
  - "Reset file input value after processing so same file can be re-imported"
  - "Auto-hide success message after 4 seconds for clean UX"
  - "validateFeedConfig with new URL() for URL format check before API call"

patterns-established:
  - "Export pattern: fetch config, JSON.stringify, Blob, createObjectURL, anchor.click, revokeObjectURL"
  - "Import pattern: FileReader.readAsText, JSON.parse, validate, POST to API, reload list"

# Metrics
duration: 2min
completed: 2026-02-17
---

# Phase 3 Plan 03: Feed Export/Import Summary

**Client-side JSON export via Blob/createObjectURL and file import via FileReader with round-trip config preservation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-17T14:53:17Z
- **Completed:** 2026-02-17T14:55:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Export button per feed row fetches config from GET /api/feeds/:slug and downloads as {slug}-config.json
- Import Feed button in dashboard header opens file picker; FileReader parses JSON and calls POST /api/feeds
- Full round-trip: exported JSON contains name, url, selectors, itemLimit, exportedAt fields sufficient to recreate feed
- Client-side validation (name, url, URL format) before API call with clear inline error messages
- Memory cleanup via immediate URL.revokeObjectURL after download trigger

## Task Commits

Each task was committed atomically:

1. **Task 1: Add export button and import section to dashboard template** - `7fd1e67` (feat)
2. **Task 2: Add export/import handlers to dashboard.js** - `585d7cc` (feat)

## Files Created/Modified
- `src/templates.ts` - Added import section (Import Feed button, hidden file input #import-file, error/success display divs) above the feeds table
- `public/js/dashboard.js` - Added exportFeed(), validateFeedConfig(), importFeed(), showImportError(), showImportSuccess(), hideImportError(); added Export button to createFeedRow(); wired import button and file input change handlers; extended event delegation for export action

## Decisions Made
- Client-side Blob download for export avoids adding a new server endpoint - simpler and sufficient for the use case
- Immediate URL.revokeObjectURL after anchor.click() prevents object URL memory leaks
- File input value reset to empty string after processing so user can re-select the same file
- Auto-hide import success message after 4 seconds to keep UI clean
- validateFeedConfig() uses new URL() constructor for URL format validation, matching server-side validation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - GET /api/feeds/:id already accepted slugs and returned url, selectors, and itemLimit fields needed for export config.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 complete: dashboard management (list/refresh/delete/edit/export/import) fully implemented
- Phase 4 (Advanced Extraction) can proceed - export/import gives users a portable config format for migration
- Feed config JSON format is stable: { name, url, selectors, itemLimit, exportedAt }

---
*Phase: 03-feed-management*
*Completed: 2026-02-17*
