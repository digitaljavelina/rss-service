# Project State: RSS Service

## Project Reference

**Core Value:** Create RSS feeds from anything. Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

**Current Focus:** Feed Management (Phase 3)

---

## Current Position

**Phase:** 3 of 6 (Feed Management) - In Progress
**Plan:** 2 of 3 in phase
**Status:** In progress
**Last activity:** 2026-02-17 - Completed 03-02-PLAN.md (feed edit with URL re-detection)

**Progress:** █████░░░░░ 31% (11/35 plans)
Phase 1: ██████████ 100% (4/4 plans)
Phase 2: ██████████ 100% (5/5 plans)
Phase 3: ██████░░░░ 67% (2/3 plans)

---

## Phase Progress

| Phase | Name | Status | Requirements | Plans | Completed |
|-------|------|--------|--------------|-------|-----------|
| 1 | Foundation & Setup | Complete ✅ | 8 | 4/4 | 100% |
| 2 | Core Feed Creation | Complete ✅ | 7 | 5/5 | 100% |
| 3 | Feed Management | In Progress | 8 | 2/3 | 67% |
| 4 | Advanced Extraction | Not Started | 3 | 0/0 | 0% |
| 5 | Automation & Scheduling | Not Started | 4 | 0/0 | 0% |
| 6 | Platform Integrations | Not Started | 5 | 0/0 | 0% |

**Overall Progress:** 11/35 plans completed (31%)

---

## Performance Metrics

**Milestone:** Foundation complete ✅
**Velocity:** 4 plans completed
**Rework Rate:** 0%

**Quality Indicators:**
- Plans completed: 9
- Phase 1 verified by user
- Phase 2 verified by user
- Deployed to Vercel production
- Supabase database operational
- Auto-detection service with pattern matching
- Preview API with auto-detection
- Feed CRUD APIs with auto-detection
- Simplified Create Feed UI (URL + name only)
- Feed refresh and XML export endpoints

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

### Open Questions

- Which visual selector library to use? (Puppeteer vs Playwright for macOS)
- How to handle authentication for platform APIs? (storage strategy)
- Job queue library choice? (node-cron vs BullMQ)

### Active Todos

(None - roadmap created, awaiting phase planning)

### Known Blockers

(None)

### Recently Resolved

(None yet)

---

## Session Continuity

**Last Session:** 2026-02-17
**Stopped at:** Completed 03-02-PLAN.md (feed edit with URL re-detection)
**Resume file:** None

**Context for Next Session:**
- Phase 1 Foundation complete and deployed to Vercel
- Phase 2 Core Feed Creation complete
- Phase 3 Plans 1-2 complete
- Production URL: https://rss-service-five.vercel.app/
- Supabase database with feeds/items tables
- Auto-detection service: autoDetectSelectors(), autoExtractItems()
- Preview API: POST /api/preview with auto-detection
- Feed CRUD API: POST/GET/PUT /api/feeds, GET /api/feeds/:id, DELETE /api/feeds/:id
- Feed refresh: POST /api/feeds/:id/refresh with deduplication
- Feed export: GET /api/feeds/:id/export with Content-Disposition
- Dashboard: GET /feeds (feed table, refresh/delete/edit actions, delete modal)
- dashboard.js: IIFE, event delegation, native dialog modal
- Edit page: GET /feeds/:slug/edit with pre-filled form
- edit-feed.js: IIFE, loadFeed(), validateForm(), PUT with urlChanged detection
- PUT endpoint clears/re-fetches items when URL changes

**Next Steps:**
1. Execute Phase 3 Plan 03 (additional feed management features)

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

---

*Last updated: 2026-02-17*
