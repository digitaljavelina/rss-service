# Requirements: RSS Service

**Version:** v1
**Created:** 2026-02-16
**Status:** Active

## v1 Requirements

### Core Feed Generation

- [x] **CORE-01**: User can create a feed by entering a URL
- [x] **CORE-02**: User can specify CSS selectors to extract feed items (title, link, description, date) — *Superseded by auto-detection (CORE-07)*
- [x] **CORE-03**: User can preview extracted content before saving feed
- [x] **CORE-04**: System generates valid RSS 2.0 XML from extracted content
- [x] **CORE-05**: System generates valid Atom feed format as alternative
- [ ] **CORE-06**: User can visually select page elements to generate CSS selectors (click-to-select)
- [x] **CORE-07**: System auto-detects common content patterns (article lists, titles, dates) — *Moved from Phase 4 to Phase 2*
- [ ] **CORE-08**: System renders JavaScript-heavy pages via headless browser when needed

### Feed Management

- [ ] **MGMT-01**: User can view all created feeds in a dashboard
- [ ] **MGMT-02**: User can edit feed configuration (selectors, title, refresh interval)
- [ ] **MGMT-03**: User can delete feeds
- [x] **MGMT-04**: User can manually trigger a feed refresh
- [ ] **MGMT-05**: System deduplicates content to prevent duplicate feed items
- [ ] **MGMT-06**: User can export feed configurations for backup
- [ ] **MGMT-07**: User can import feed configurations from backup

### Refresh & Scheduling

- [ ] **SCHED-01**: System polls feeds on configurable intervals (per-feed setting)
- [ ] **SCHED-02**: System runs background jobs to fetch feed updates
- [ ] **SCHED-03**: User can set refresh interval (e.g., 15min, 30min, 1hr, 6hr, daily)
- [ ] **SCHED-04**: System tracks last update time per feed

### Platform Integrations

- [ ] **PLAT-01**: User can create feeds from YouTube channels/playlists via API
- [ ] **PLAT-02**: User can create feeds from Twitter/X accounts via API
- [ ] **PLAT-03**: User can create feeds from Reddit subreddits/users via API
- [ ] **PLAT-04**: User can configure API keys for each platform
- [ ] **PLAT-05**: System respects API rate limits and implements backoff

### Output & Serving

- [x] **OUT-01**: System serves RSS feeds at localhost URLs (e.g., localhost:3000/feeds/123)
- [x] **OUT-02**: System sets proper Content-Type headers (application/rss+xml)
- [x] **OUT-03**: User can export a feed as static XML file
- [x] **OUT-04**: System caches feed content for fast serving

### User Interface

- [x] **UI-01**: Web UI is clean, uncluttered, and easy to navigate
- [ ] **UI-02**: Dashboard shows feed status (last updated, item count, errors)
- [ ] **UI-03**: Error states are clearly communicated to user
- [x] **UI-04**: UI works in modern browsers (Chrome, Firefox, Safari)

### Data & Storage

- [x] **DATA-01**: System stores feeds and items in SQLite database — *Using Supabase (PostgreSQL) for serverless*
- [x] **DATA-02**: System persists data across app restarts
- [x] **DATA-03**: System limits stored items per feed (configurable, default 100)

---

## v2 Requirements (Deferred)

- [ ] Feed filtering by keywords
- [ ] Feed transformation (modify content before output)
- [ ] Feed bundling (combine multiple feeds into one)
- [ ] Webhook notifications on feed updates
- [ ] Native Mac app wrapper
- [ ] Feed analytics (view counts, popular items)
- [ ] Multi-language/translation support

---

## Out of Scope

- **Cloud deployment** — this is local-only, no hosted version
- **Multi-user/authentication** — single user tool, no login needed
- **Built-in feed reader** — generates feeds for external readers
- **Full-content storage** — stores excerpts and links, not full articles
- **Automatic crawling** — requires explicit URL input per feed

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 2 | Superseded by CORE-07 |
| CORE-03 | Phase 2 | Complete |
| CORE-04 | Phase 2 | Complete |
| CORE-05 | Phase 2 | Complete |
| CORE-06 | Phase 4 | Pending |
| CORE-07 | Phase 2 | Complete (moved from Phase 4) |
| CORE-08 | Phase 4 | Pending |
| MGMT-01 | Phase 3 | Pending |
| MGMT-02 | Phase 3 | Pending |
| MGMT-03 | Phase 3 | Pending |
| MGMT-04 | Phase 2 | Complete |
| MGMT-05 | Phase 3 | Pending |
| MGMT-06 | Phase 3 | Pending |
| MGMT-07 | Phase 3 | Pending |
| SCHED-01 | Phase 5 | Pending |
| SCHED-02 | Phase 5 | Pending |
| SCHED-03 | Phase 5 | Pending |
| SCHED-04 | Phase 5 | Pending |
| PLAT-01 | Phase 6 | Pending |
| PLAT-02 | Phase 6 | Pending |
| PLAT-03 | Phase 6 | Pending |
| PLAT-04 | Phase 6 | Pending |
| PLAT-05 | Phase 6 | Pending |
| OUT-01 | Phase 1 | Complete |
| OUT-02 | Phase 1 | Complete |
| OUT-03 | Phase 2 | Complete |
| OUT-04 | Phase 1 | Complete |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete (Supabase) |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |

---
*Last updated: 2026-02-17*
