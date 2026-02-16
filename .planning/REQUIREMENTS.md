# Requirements: RSS Service

**Version:** v1
**Created:** 2026-02-16
**Status:** Active

## v1 Requirements

### Core Feed Generation

- [ ] **CORE-01**: User can create a feed by entering a URL
- [ ] **CORE-02**: User can specify CSS selectors to extract feed items (title, link, description, date)
- [ ] **CORE-03**: User can preview extracted content before saving feed
- [ ] **CORE-04**: System generates valid RSS 2.0 XML from extracted content
- [ ] **CORE-05**: System generates valid Atom feed format as alternative
- [ ] **CORE-06**: User can visually select page elements to generate CSS selectors (click-to-select)
- [ ] **CORE-07**: System auto-detects common content patterns (article lists, titles, dates)
- [ ] **CORE-08**: System renders JavaScript-heavy pages via headless browser when needed

### Feed Management

- [ ] **MGMT-01**: User can view all created feeds in a dashboard
- [ ] **MGMT-02**: User can edit feed configuration (selectors, title, refresh interval)
- [ ] **MGMT-03**: User can delete feeds
- [ ] **MGMT-04**: User can manually trigger a feed refresh
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

- [ ] **OUT-01**: System serves RSS feeds at localhost URLs (e.g., localhost:3000/feeds/123)
- [ ] **OUT-02**: System sets proper Content-Type headers (application/rss+xml)
- [ ] **OUT-03**: User can export a feed as static XML file
- [ ] **OUT-04**: System caches feed content for fast serving

### User Interface

- [ ] **UI-01**: Web UI is clean, uncluttered, and easy to navigate
- [ ] **UI-02**: Dashboard shows feed status (last updated, item count, errors)
- [ ] **UI-03**: Error states are clearly communicated to user
- [ ] **UI-04**: UI works in modern browsers (Chrome, Firefox, Safari)

### Data & Storage

- [ ] **DATA-01**: System stores feeds and items in SQLite database
- [ ] **DATA-02**: System persists data across app restarts
- [ ] **DATA-03**: System limits stored items per feed (configurable, default 100)

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
| CORE-01 | — | Pending |
| CORE-02 | — | Pending |
| CORE-03 | — | Pending |
| CORE-04 | — | Pending |
| CORE-05 | — | Pending |
| CORE-06 | — | Pending |
| CORE-07 | — | Pending |
| CORE-08 | — | Pending |
| MGMT-01 | — | Pending |
| MGMT-02 | — | Pending |
| MGMT-03 | — | Pending |
| MGMT-04 | — | Pending |
| MGMT-05 | — | Pending |
| MGMT-06 | — | Pending |
| MGMT-07 | — | Pending |
| SCHED-01 | — | Pending |
| SCHED-02 | — | Pending |
| SCHED-03 | — | Pending |
| SCHED-04 | — | Pending |
| PLAT-01 | — | Pending |
| PLAT-02 | — | Pending |
| PLAT-03 | — | Pending |
| PLAT-04 | — | Pending |
| PLAT-05 | — | Pending |
| OUT-01 | — | Pending |
| OUT-02 | — | Pending |
| OUT-03 | — | Pending |
| OUT-04 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| UI-03 | — | Pending |
| UI-04 | — | Pending |
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |

---
*Last updated: 2026-02-16*
