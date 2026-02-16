# Roadmap: RSS Service

## Overview

**Total phases:** 6
**Total requirements:** 35
**Coverage:** 100%
**Depth:** Standard (5-8 phases, 3-5 plans each)

This roadmap delivers a self-hosted RSS feed generator by progressing from foundation to core value to enhancements. Each phase delivers a complete, verifiable capability.

---

## Phases

### Phase 1: Foundation & Setup

**Goal:** User can access a running web application with persistent storage and feed serving capability.

**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Project setup with TypeScript and SQLite database layer
- [ ] 01-02-PLAN.md — Express server with feed serving and content negotiation
- [ ] 01-03-PLAN.md — Web UI shell with sidebar and theme toggle
- [ ] 01-04-PLAN.md — Human verification of complete foundation

**Requirements:**
- DATA-01: System stores feeds and items in SQLite database
- DATA-02: System persists data across app restarts
- DATA-03: System limits stored items per feed (configurable, default 100)
- OUT-01: System serves RSS feeds at localhost URLs (e.g., localhost:3000/feeds/123)
- OUT-02: System sets proper Content-Type headers (application/rss+xml)
- OUT-04: System caches feed content for fast serving
- UI-01: Web UI is clean, uncluttered, and easy to navigate
- UI-04: UI works in modern browsers (Chrome, Firefox, Safari)

**Success Criteria:**
1. User can navigate to localhost URL and see the application home page
2. User can refresh browser and data persists (no data loss on restart)
3. Feed URLs return proper Content-Type headers when accessed
4. SQLite database file is created and readable on disk

**Dependencies:** None

---

### Phase 2: Core Feed Creation

**Goal:** User can create and serve valid RSS feeds from any website using CSS selectors.

**Requirements:**
- CORE-01: User can create a feed by entering a URL
- CORE-02: User can specify CSS selectors to extract feed items (title, link, description, date)
- CORE-03: User can preview extracted content before saving feed
- CORE-04: System generates valid RSS 2.0 XML from extracted content
- CORE-05: System generates valid Atom feed format as alternative
- MGMT-04: User can manually trigger a feed refresh
- OUT-03: User can export a feed as static XML file

**Success Criteria:**
1. User can enter a URL, define CSS selectors, and see extracted content preview
2. User can save a feed configuration and receive a localhost RSS URL
3. User can access the RSS URL in browser and see valid XML with extracted items
4. User can download feed as static XML file from the UI

**Dependencies:** Phase 1

---

### Phase 3: Feed Management

**Goal:** User can view, edit, delete, and manage multiple feeds through a dashboard.

**Requirements:**
- MGMT-01: User can view all created feeds in a dashboard
- MGMT-02: User can edit feed configuration (selectors, title, refresh interval)
- MGMT-03: User can delete feeds
- MGMT-05: System deduplicates content to prevent duplicate feed items
- MGMT-06: User can export feed configurations for backup
- MGMT-07: User can import feed configurations from backup
- UI-02: Dashboard shows feed status (last updated, item count, errors)
- UI-03: Error states are clearly communicated to user

**Success Criteria:**
1. User can view a dashboard listing all feeds with status information
2. User can click on a feed to edit its configuration and save changes
3. User can delete a feed and it disappears from dashboard and stops serving
4. User can export all feed configs as JSON and re-import them later
5. Duplicate content is not shown in feed output (deduplication works)

**Dependencies:** Phase 2

---

### Phase 4: Advanced Extraction

**Goal:** User can extract content from complex websites without manually writing CSS selectors.

**Requirements:**
- CORE-06: User can visually select page elements to generate CSS selectors (click-to-select)
- CORE-07: System auto-detects common content patterns (article lists, titles, dates)
- CORE-08: System renders JavaScript-heavy pages via headless browser when needed

**Success Criteria:**
1. User can click "Visual Selector" mode and interact with embedded page to select elements
2. User clicks on page elements and system generates working CSS selectors automatically
3. User can choose "Auto-detect" option and system finds article patterns without manual selection
4. JavaScript-heavy sites (e.g., SPA frameworks) load correctly and content is extractable

**Dependencies:** Phase 2

---

### Phase 5: Automation & Scheduling

**Goal:** Feeds automatically update on schedule without manual intervention.

**Requirements:**
- SCHED-01: System polls feeds on configurable intervals (per-feed setting)
- SCHED-02: System runs background jobs to fetch feed updates
- SCHED-03: User can set refresh interval (e.g., 15min, 30min, 1hr, 6hr, daily)
- SCHED-04: System tracks last update time per feed

**Success Criteria:**
1. User can configure a feed with 15-minute refresh interval and see it update automatically
2. User can view last update timestamp for each feed in dashboard
3. Background jobs run without blocking the web UI
4. Multiple feeds update concurrently without conflicts

**Dependencies:** Phase 2

---

### Phase 6: Platform Integrations

**Goal:** User can create feeds from YouTube, Twitter, and Reddit using official APIs.

**Requirements:**
- PLAT-01: User can create feeds from YouTube channels/playlists via API
- PLAT-02: User can create feeds from Twitter/X accounts via API
- PLAT-03: User can create feeds from Reddit subreddits/users via API
- PLAT-04: User can configure API keys for each platform
- PLAT-05: System respects API rate limits and implements backoff

**Success Criteria:**
1. User can enter YouTube channel URL and API key, then receive a working RSS feed
2. User can enter Twitter/X handle and API credentials, then receive a working RSS feed
3. User can enter Reddit subreddit and API credentials, then receive a working RSS feed
4. System displays clear error when API rate limit is hit (not silent failure)
5. API keys are securely stored and reused across app restarts

**Dependencies:** Phase 1

---

## Requirement Mapping

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| CORE-01 | 2 | User can create a feed by entering a URL |
| CORE-02 | 2 | User can specify CSS selectors to extract feed items |
| CORE-03 | 2 | User can preview extracted content before saving |
| CORE-04 | 2 | System generates valid RSS 2.0 XML |
| CORE-05 | 2 | System generates valid Atom feed format |
| CORE-06 | 4 | User can visually select page elements (click-to-select) |
| CORE-07 | 4 | System auto-detects common content patterns |
| CORE-08 | 4 | System renders JavaScript-heavy pages via headless browser |
| MGMT-01 | 3 | User can view all feeds in a dashboard |
| MGMT-02 | 3 | User can edit feed configuration |
| MGMT-03 | 3 | User can delete feeds |
| MGMT-04 | 2 | User can manually trigger a feed refresh |
| MGMT-05 | 3 | System deduplicates content |
| MGMT-06 | 3 | User can export feed configurations |
| MGMT-07 | 3 | User can import feed configurations |
| SCHED-01 | 5 | System polls feeds on configurable intervals |
| SCHED-02 | 5 | System runs background jobs for updates |
| SCHED-03 | 5 | User can set refresh interval per feed |
| SCHED-04 | 5 | System tracks last update time |
| PLAT-01 | 6 | YouTube channel/playlist feeds via API |
| PLAT-02 | 6 | Twitter/X account feeds via API |
| PLAT-03 | 6 | Reddit subreddit/user feeds via API |
| PLAT-04 | 6 | User can configure API keys |
| PLAT-05 | 6 | System respects rate limits |
| OUT-01 | 1 | Serve feeds at localhost URLs |
| OUT-02 | 1 | Proper Content-Type headers |
| OUT-03 | 2 | Export as static XML |
| OUT-04 | 1 | Cache feed content |
| UI-01 | 1 | Clean, uncluttered web UI |
| UI-02 | 3 | Dashboard shows feed status |
| UI-03 | 3 | Clear error states |
| UI-04 | 1 | Works in modern browsers |
| DATA-01 | 1 | SQLite database storage |
| DATA-02 | 1 | Persist across restarts |
| DATA-03 | 1 | Configurable item limits |

---

## Progress Tracking

| Phase | Name | Status | Requirements | Plans |
|-------|------|--------|--------------|-------|
| 1 | Foundation & Setup | Planned | 8 | 0/4 |
| 2 | Core Feed Creation | Not Started | 7 | 0/0 |
| 3 | Feed Management | Not Started | 8 | 0/0 |
| 4 | Advanced Extraction | Not Started | 3 | 0/0 |
| 5 | Automation & Scheduling | Not Started | 4 | 0/0 |
| 6 | Platform Integrations | Not Started | 5 | 0/0 |

**Total:** 35 requirements across 6 phases

---

*Last updated: 2026-02-16*
