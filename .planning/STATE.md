# Project State: RSS Service

## Project Reference

**Core Value:** Create RSS feeds from anything. Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

**Current Focus:** Phase 5 In Progress - Cron scheduler deployed, need CRON_SECRET + feed settings UI

---

## Current Position

**Phase:** 5 of 6 (Automation & Scheduling) - In progress
**Plan:** 2 of 5 in phase (complete)
**Status:** In progress
**Last activity:** 2026-02-18 - Completed 05-02-PLAN.md (Vercel cron job for feed scheduling)

**Progress:** ██████████░░░░░░░░░░ 50% (18/36 plans)
Phase 1: ██████████ 100% (4/4 plans)
Phase 2: ██████████ 100% (5/5 plans)
Phase 3: ██████████ 100% (4/4 plans)
Phase 4: ██████████ 100% (3/3 plans)
Phase 5: ████░░░░░░ 40% (2/5 plans)

---

## Phase Progress

| Phase | Name | Status | Requirements | Plans | Completed |
|-------|------|--------|--------------|-------|-----------|
| 1 | Foundation & Setup | Complete | 8 | 4/4 | 100% |
| 2 | Core Feed Creation | Complete | 7 | 5/5 | 100% |
| 3 | Feed Management | Complete | 8 | 4/4 | 100% |
| 4 | Advanced Extraction | Complete | 3 | 3/3 | 100% |
| 5 | Automation & Scheduling | In Progress | 4 | 2/5 | 40% |
| 6 | Platform Integrations | Not Started | 5 | 0/0 | 0% |

**Overall Progress:** 18/36 plans completed (50%)

---

## Performance Metrics

**Milestone:** Phase 5 Plan 02 complete - Vercel cron job for feed scheduling deployed
**Velocity:** 18 plans completed
**Rework Rate:** 0%

**Quality Indicators:**
- Plans completed: 16
- Phase 1-4 verified by user
- Deployed to Vercel production
- Supabase database operational
- Auto-detection service with pattern matching
- Preview API with auto-detection
- Feed CRUD APIs with auto-detection
- Simplified Create Feed UI (URL + name only)
- Feed refresh and XML export endpoints
- Feed dashboard with list/refresh/delete/edit actions
- Feed edit with URL re-detection and urlChanged signaling
- Feed export (JSON download) and import (JSON upload)
- Automatic headless browser for JS-heavy sites
- Simplified UX (no manual toggles or selector UI)

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Web app over native | Faster to build, browser dev tools, native can come later | 2026-02-16 |
| SQLite over PostgreSQL | Zero setup, single file, perfect for local single-user use | 2026-02-16 |
| Official APIs over scraping | More reliable, respects platform terms, worth the key setup | 2026-02-16 |
| Visual selector + CSS fallback | Easy path for simple cases, power tools when needed | 2026-02-16 |
| Node.js + Express + SQLite stack | Mature ecosystem, excellent for web scraping and I/O | 2026-02-16 |
| Cheerio-first with Puppeteer fallback | Fast static parsing with JS rendering when needed | 2026-02-16 |
| ES modules over CommonJS | Modern Node.js standard, better tree-shaking | 2026-02-16 |
| WAL mode for SQLite | Better concurrent access without blocking writes | 2026-02-16 |
| TEXT dates with ISO 8601 | SQLite sorts ISO date strings correctly | 2026-02-16 |
| tsx for development | Fast TypeScript execution without compilation | 2026-02-16 |
| Default to RSS 2.0 | Most feed readers support RSS, Atom is less universal | 2026-02-16 |
| In-memory cache with 5min TTL | Simple, fast, sufficient for single-user local app | 2026-02-16 |
| Auto-port selection (3000-3100) | Avoids manual port conflicts during development | 2026-02-16 |
| Tailwind v4 with daisyUI | Modern utility CSS with pre-built components, faster than custom styling | 2026-02-16 |
| Alpine.js from CDN | Lightweight reactivity without build step, perfect for small interactive needs | 2026-02-16 |
| No template engine | Simple string replacement sufficient for static layouts | 2026-02-16 |
| Theme in localStorage | Persists across sessions, no backend needed | 2026-02-16 |
| Sidebar always visible | Consistent navigation, no responsive collapse needed | 2026-02-16 |
| SQLite → Supabase | Required for Vercel serverless deployment | 2026-02-17 |
| Vercel for hosting | Free tier, GitHub integration, serverless functions | 2026-02-17 |
| Lazy Supabase init | Prevents module-load crashes in serverless environment | 2026-02-17 |
| chrono-node has built-in types | No @types package needed, library includes TypeScript definitions | 2026-02-17 |
| Content-based GUIDs | SHA-256 hash of feedId:title:link ensures deduplication across extractions | 2026-02-17 |
| Slug collision handling | Check existence before insert, append nanoid(6) suffix if duplicate | 2026-02-17 |
| Extract items on feed create | Items stored immediately on feed creation rather than delayed | 2026-02-17 |
| Vanilla JS for form handling | No framework overhead for simple form validation and API calls | 2026-02-17 |
| Preview required before save | Ensures selectors work correctly before creating feed | 2026-02-17 |
| Safe DOM methods (textContent) | Prevents XSS by avoiding innerHTML with user content | 2026-02-17 |
| Cache invalidation on refresh | Ensures fresh content served after manual refresh | 2026-02-17 |
| Content-Disposition for exports | Browser handles file download with proper filename | 2026-02-17 |
| Event delegation for table actions | Single document click handler scales to dynamic rows without per-row listeners | 2026-02-17 |
| DOM removal on delete vs reload | Remove row immediately for faster UX, check empty state after | 2026-02-17 |
| Native dialog for modals | daisyUI dialog element with showModal()/close() - no JS library needed | 2026-02-17 |
| Clear items on URL change | Delete all items and re-fetch fresh when feed URL changes to avoid stale/mismatched items | 2026-02-17 |
| urlChanged flag in PUT response | Backend signals URL change so client shows specific success message without client-side comparison | 2026-02-17 |
| Readonly RSS URL as input | Input element for RSS URL display allows triple-click selection and consistent styling | 2026-02-17 |
| Client-side Blob for JSON export | Avoids new server endpoint; Blob + createObjectURL + revokeObjectURL sufficient for file download | 2026-02-17 |
| FileReader for JSON import | Reads file client-side, validates, then POSTs to existing /api/feeds endpoint | 2026-02-17 |
| Reset file input after processing | Allows user to re-select same file for re-import without clearing the value manually | 2026-02-17 |
| Single-row refresh | Refresh updates only the affected row instead of reloading entire table | 2026-02-17 |
| Div wrapper for flex in td | Using flex directly on td breaks table-cell display; wrap in div instead | 2026-02-17 |
| @sparticuz/chromium for serverless | Purpose-built for Lambda/Vercel; fits 250MB bundle limit with puppeteer-core | 2026-02-17 |
| Lazy browser singleton | Reuse browser across warm instances; launching per-request adds 3-8s cold start | 2026-02-17 |
| headless: 'shell' mode | Required for @sparticuz/chromium; 'true' deprecated in Puppeteer v21+ | 2026-02-17 |
| Environment detection for browser | process.env.VERCEL check; use @sparticuz/chromium on Vercel, full puppeteer locally | 2026-02-17 |
| Remove selector adjustment UI | Most users won't understand CSS selectors; keep detection automatic | 2026-02-18 |
| Automatic headless browser | No manual toggle; system detects JS-heavy pages and retries with headless automatically | 2026-02-18 |
| Manual SQL migration for schema changes | Supabase SQL Editor used directly; consistent with original schema creation approach | 2026-02-18 |
| refresh_status defaults to 'idle' | Safe default for existing rows; no backfill required after column addition | 2026-02-18 |
| NULL refresh_interval_minutes = manual only | Explicit nullable design avoids sentinel integers for manual-only refresh | 2026-02-18 |
| TIMESTAMPTZ for next_refresh_at | Timezone-aware scheduling ensures correct behavior across server regions | 2026-02-18 |
| CRON_SECRET via Authorization header | Vercel auto-injects secret; handler checks header and returns 401 for unauthorized requests | 2026-02-18 |
| MAX_FEEDS_PER_RUN = 5 | Caps per-cron feed count to stay within 60s serverless timeout | 2026-02-18 |
| next_refresh_at updates on error | Prevents tight retry loops on persistently failing feeds | 2026-02-18 |
| refresh_status locking | Marks feeds 'refreshing' before work to prevent concurrent cron overlap | 2026-02-18 |

### Open Questions

- How to handle authentication for platform APIs? (storage strategy)
- Job queue library choice? (node-cron vs BullMQ - to be resolved in Plan 05-02)

### Active Todos

- Add CRON_SECRET to Vercel Dashboard environment variables (openssl rand -hex 32)
- Execute Plan 05-03 (feed settings UI for refresh interval)
- Execute Plan 05-04 (API routes for scheduling)
- Execute Plan 05-05 (verification)

### Known Blockers

(None)

### Recently Resolved

(None yet)

---

## Session Continuity

**Last Session:** 2026-02-18
**Stopped at:** Completed 05-02-PLAN.md (Vercel cron job for feed scheduling)
**Resume file:** None

**Context for Next Session:**
- Phase 1-4 complete and deployed to Vercel
- Production URL: https://rss-service-five.vercel.app/
- Supabase database with feeds/items tables + scheduling columns
- Scheduling columns: refresh_interval_minutes, next_refresh_at, refresh_status, last_refresh_error
- Indexes: idx_feeds_next_refresh (partial), idx_feeds_refresh_status
- FeedRow TypeScript interface updated (src/types/feed.ts)
- REFRESH_INTERVALS constant exported from src/types/feed.ts
- Auto-detection service: autoDetectSelectors(), autoExtractItems()
- Headless browser infrastructure: page-fetcher-browser.ts with fetchPageWithBrowser()
- Vercel config: memory 1024MB, maxDuration 60s for both api/index.ts and api/cron/scheduler.ts
- Cron job: api/cron/scheduler.ts - runs every minute, queries next_refresh_at, uses refresh_status lock
- CRON_SECRET: must be added to Vercel Dashboard before cron job will authenticate

**Next Steps:**
1. Add CRON_SECRET to Vercel Dashboard environment variables
2. Plan 05-03: Feed settings UI for refresh interval configuration

---

## Checkpoints

### Phase 1 Checkpoint (2026-02-17)
- Foundation verified and approved
- Deployed to: https://rss-service-five.vercel.app/
- Database: Supabase (migrated from SQLite)
- All Phase 1 requirements satisfied

### Phase 2 Checkpoint (2026-02-17)
- Core feed creation verified and approved
- Auto-detection replaces manual CSS selectors (per user request)
- Simplified UX: URL → Preview → Create Feed
- Tested with Hacker News, works correctly
- All Phase 2 requirements satisfied (CORE-02 superseded by CORE-07)

### Phase 3 Checkpoint (2026-02-17)
- All 4 plans executed (dashboard, edit, export/import, verification)
- Human verification completed and approved
- Fixes during verification:
  - Single-row refresh (e35d40d) - refresh updates only affected row
  - Table alignment fix (27c8b2e) - wrap action buttons in div for proper layout
- All features verified: Dashboard, Refresh, Edit, Delete, Export, Import, Error States
- No blockers for Phase 4

### Phase 4 Checkpoint (2026-02-18)
- All 3 plans executed (headless infrastructure, API wiring, verification)
- Human verification completed and approved
- UX simplifications during verification:
  - Removed selector adjustment panel (users don't need to see CSS selectors)
  - Removed headless browser toggle (automatic detection is better UX)
- Final implementation: automatic JS detection with headless fallback
- All Phase 4 requirements satisfied (CORE-06, CORE-07, CORE-08)

---

*Last updated: 2026-02-18 (after 05-02 completion)*
