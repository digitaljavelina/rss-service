# RSS Service

## What This Is

A local web application that generates RSS feeds from any website or service that doesn't natively offer one — similar to rss.app but running entirely on your machine.

## Core Value

**Create RSS feeds from anything.** Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

## The Problem

Many websites and social platforms don't provide RSS feeds, making it hard to follow updates without constantly checking each site manually. Existing services like rss.app solve this but run in the cloud, require subscriptions, and don't give you control over your data.

## The Solution

A self-hosted RSS feed generator with:
- **Visual element selector** — click on page elements to define what becomes feed items
- **Multiple selection modes** — auto-detect, click-to-select, or CSS selectors for power users
- **Social platform integrations** — YouTube, Twitter, Reddit, etc. via official APIs
- **Smart caching** — configurable refresh intervals, background polling
- **Clean UI** — uncluttered, easy to navigate, no feature bloat

## How It Works

1. Paste a URL into the web interface
2. App loads the page and presents selection options:
   - Auto-detect (for common patterns)
   - Visual selector (click elements directly)
   - CSS selector input (for precise control)
3. Configure refresh schedule (every 15min, hourly, daily, etc.)
4. Get a localhost RSS URL to add to your reader
5. Optionally export as static XML file

## Target User

You. Someone who:
- Uses an RSS reader as their primary way to follow content
- Wants to follow sites/accounts that don't offer RSS
- Prefers local, self-hosted tools over cloud services
- Values a clean, functional interface

## Constraints

- **Local only** — runs on localhost, no cloud deployment needed
- **Mac-first** — running on macOS (Darwin), potential native app later
- **API keys required** — social platform integrations need user-provided credentials
- **Single user** — no auth/multi-user complexity

## Technical Direction

- **Web UI** — localhost web app (browser-based)
- **Storage** — SQLite (zero setup, easy backup, single file)
- **Background jobs** — scheduler for polling feeds on configured intervals
- **Feed serving** — local server serves RSS XML at localhost URLs
- **Export** — generate static XML files on demand

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Create RSS feed from any URL via content extraction
- [ ] Visual element selector (click page elements to define feed items)
- [ ] CSS selector input for precise control
- [ ] Auto-detect common content patterns
- [ ] YouTube integration via API
- [ ] Twitter/X integration via API
- [ ] Reddit integration via API
- [ ] Configurable refresh intervals per feed
- [ ] Background polling on schedule
- [ ] Serve feeds at localhost URLs
- [ ] Export feeds as static XML files
- [ ] Clean, uncluttered web UI
- [ ] Feed management dashboard (list, edit, delete feeds)

### Out of Scope

- Cloud deployment — this is local-only
- Multi-user/authentication — single user tool
- Native Mac app — web-first, maybe later
- Feed aggregation/bundling — keep it simple for v1
- Keyword filtering — v2 consideration
- Translation features — v2 consideration

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over native | Faster to build, browser already has good dev tools, native can come later | — Pending |
| SQLite over PostgreSQL | Zero setup, single file, plenty capable for local single-user use | — Pending |
| Official APIs over scraping | More reliable, respects platform terms, worth the key setup | — Pending |
| Visual selector + CSS fallback | Easy path for simple cases, power tools when needed | — Pending |

---
*Last updated: 2026-02-16 after initialization*
