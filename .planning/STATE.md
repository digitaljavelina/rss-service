# Project State: RSS Service

## Project Reference

**Core Value:** Create RSS feeds from anything. Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

**Current Focus:** Phase 6 Complete - Platform Integrations (YouTube + Reddit). Twitter/X dropped (API cost).

---

## Current Position

**Phase:** 6 of 6 (Platform Integrations) - Complete
**Plan:** 5 of 5 in phase (complete)
**Status:** Complete
**Last activity:** 2026-02-18 - Completed all 5 plans for Phase 6

**Progress:** ████████████████████ 100% (28/28 plans)
Phase 1: ██████████ 100% (4/4 plans)
Phase 2: ██████████ 100% (5/5 plans)
Phase 3: ██████████ 100% (4/4 plans)
Phase 4: ██████████ 100% (3/3 plans)
Phase 5: ██████████ 100% (5/5 plans)
Phase 6: ██████████ 100% (5/5 plans)

---

## Phase Progress

| Phase | Name | Status | Requirements | Plans | Completed |
|-------|------|--------|--------------|-------|-----------|
| 1 | Foundation & Setup | Complete | 8 | 4/4 | 100% |
| 2 | Core Feed Creation | Complete | 7 | 5/5 | 100% |
| 3 | Feed Management | Complete | 8 | 4/4 | 100% |
| 4 | Advanced Extraction | Complete | 3 | 3/3 | 100% |
| 5 | Automation & Scheduling | Complete | 4 | 5/5 | 100% |
| 6 | Platform Integrations | Complete | 4 | 5/5 | 100% |

**Overall Progress:** 28/28 plans completed (100%)

---

## Performance Metrics

**Milestone:** Phase 6 Complete - YouTube and Reddit platform feeds, settings page, scheduler updated
**Velocity:** 28 plans completed
**Rework Rate:** 0%

**Quality Indicators:**
- Plans completed: 28
- Phase 1-5 verified by user
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
- Auto-refresh scheduling with configurable intervals
- Cron scheduler with refresh_status locking
- Dashboard shows Last Updated, Next Refresh, Status per feed
- YouTube feed creation via Data API v3
- Reddit feed creation via built-in RSS
- Settings page for API key management
- Platform-aware scheduler for all feed types

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
| Default refresh interval = Every hour | 60 min default on create feed form balances freshness and server load | 2026-02-18 |
| hasOwnProperty check in PUT for interval | Allows partial PUT updates without accidentally clearing refresh interval | 2026-02-18 |
| refresh_status defaults to 'idle' | Safe default for existing rows; no backfill required after column addition | 2026-02-18 |
| NULL refresh_interval_minutes = manual only | Explicit nullable design avoids sentinel integers for manual-only refresh | 2026-02-18 |
| TIMESTAMPTZ for next_refresh_at | Timezone-aware scheduling ensures correct behavior across server regions | 2026-02-18 |
| CRON_SECRET via Authorization header | Vercel auto-injects secret; handler checks header and returns 401 for unauthorized requests | 2026-02-18 |
| MAX_FEEDS_PER_RUN = 5 | Caps per-cron feed count to stay within 60s serverless timeout | 2026-02-18 |
| next_refresh_at updates on error | Prevents tight retry loops on persistently failing feeds | 2026-02-18 |
| refresh_status locking | Marks feeds 'refreshing' before work to prevent concurrent cron overlap | 2026-02-18 |
| timeAgo for Last Updated | Relative time (e.g., "5 min ago") more scannable than absolute dates in dashboard | 2026-02-18 |
| timeUntil null = "Manual" | next_refresh_at=null displayed as "Manual" to clearly indicate no auto-schedule | 2026-02-18 |
| Idle shown as text not badge | Only actionable states (refreshing/error) get badges; idle is subtle text to reduce noise | 2026-02-18 |
| Error tooltip via title attr | Native browser tooltip for error details on hover; no JS library needed | 2026-02-18 |
| Daily cron for Vercel Hobby | Hobby plan limits to once/day; keep all interval options for self-hosted/Pro | 2026-02-18 |
| "Back to My Feeds" label | Consistent with sidebar naming; "Dashboard" in sidebar = home page, not feed list | 2026-02-18 |
| Skip Twitter/X entirely | API costs $100+/month for read access; impractical for free self-hosted tool | 2026-02-18 |
| Reddit built-in RSS over API | Reddit provides /r/sub.rss natively; no API key needed, simpler and more reliable | 2026-02-18 |
| YouTube uploads playlist trick | Replace "UC" → "UU" in channelId to get uploads playlist; 1 quota unit vs 100 for search | 2026-02-18 |
| Settings table for API keys | Key-value store with masked display; extensible for future platform keys | 2026-02-18 |
| feed_type column routing | Routes preview/create/refresh/cron by feed_type instead of URL pattern matching | 2026-02-18 |
| Read-only URL for platform feeds | YouTube/Reddit feed URLs tied to channel/subreddit; editing URL makes no sense | 2026-02-18 |

### Open Questions

(None)

### Active Todos

(None)

### Known Blockers

(None)

### Recently Resolved

- Phase 6 SQL migration needs to be run in Supabase SQL Editor
- Settings page for YouTube API key management
- Platform-aware scheduler handles web, YouTube, and Reddit feeds

---

## Session Continuity

**Last Session:** 2026-02-18
**Stopped at:** Phase 6 Complete - all 5 plans executed
**Resume file:** None

**Context for Next Session:**
- Phase 1-6 complete and deployed to Vercel
- Production URL: https://rss-service-five.vercel.app/
- Supabase database with feeds/items/settings tables + platform columns
- Cron schedule: daily at midnight UTC (Vercel Hobby plan)
- CRON_SECRET configured in Vercel Dashboard
- YouTube feeds via Data API v3 (requires API key in Settings)
- Reddit feeds via built-in RSS (no API key needed)
- Twitter/X intentionally not supported (API cost barrier)
- Phase 6 SQL migration must be run before platform features work

**Next Steps:**
1. Run Phase 6 SQL migration in Supabase SQL Editor
2. Deploy to Vercel
3. Human verification of all platform flows

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

### Phase 5 Checkpoint (2026-02-18)
- All 5 plans executed (schema, cron, interval UI, dashboard timing, verification)
- Human verification completed and approved
- Fixes during verification:
  - Cron schedule changed from every-minute to daily (Vercel Hobby plan)
  - "Back to Dashboard" renamed to "Back to My Feeds" for nav consistency
- All features verified: auto-refresh, interval config, dashboard timing, manual-only
- All Phase 5 requirements satisfied (SCHED-01 through SCHED-04)

### Phase 6 Checkpoint (2026-02-18)
- All 5 plans executed (schema+settings, YouTube, Reddit, UI, scheduler+verification)
- Twitter/X dropped (API cost $100+/month)
- Reddit uses built-in RSS (no API key needed)
- YouTube uses Data API v3 with uploads playlist trick for quota efficiency
- Pending: SQL migration, deployment, human verification

---

*Last updated: 2026-02-18 (Phase 6 code complete - awaiting verification)*
