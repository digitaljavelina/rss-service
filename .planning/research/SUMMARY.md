# Project Research Summary

**Project:** RSS Service (Local RSS Feed Generator)
**Domain:** Self-hosted RSS feed generator with web scraping and social API integrations
**Researched:** 2026-02-16
**Confidence:** MEDIUM

## Executive Summary

Building a local RSS feed generator requires a modular architecture with clear component boundaries: a web UI layer, API server, content fetching system, RSS builder, visual selector engine, job scheduler, and SQLite storage. The key differentiator is combining commercial-quality UX (visual element selector) with self-hosted privacy.

The recommended stack is Node.js with Express, SQLite via better-sqlite3, Cheerio + Puppeteer for web scraping (Cheerio-first for speed, Puppeteer fallback for JavaScript-heavy sites), and Alpine.js + Tailwind for the frontend. This balances simplicity with capability.

Critical pitfalls to avoid: sites changing structure without detection, invalid RSS feed generation, API rate limit violations, background job failures, and generating brittle CSS selectors.

## Key Findings

### Recommended Stack

**Core technologies:**
- Node.js 20 LTS + Express + TypeScript — mature ecosystem, excellent for web scraping and I/O
- SQLite via better-sqlite3 — zero-config, single file, perfect for local apps
- Cheerio + Puppeteer — fast static parsing with JS rendering fallback
- Alpine.js + Tailwind CSS — lightweight frontend without React complexity
- node-cron (or BullMQ for persistence) — background job scheduling
- feed library — battle-tested RSS 2.0/Atom generation

**Platform integrations:**
- googleapis (YouTube Data API v3)
- twitter-api-v2 (Twitter/X)
- snoowrap (Reddit)

### Expected Features

**Must have (table stakes):**
- URL input with CSS/XPath selector support
- RSS 2.0 and Atom output formats
- Feed preview and validation
- Multiple feed management
- Configurable refresh intervals
- Error handling for broken sources

**Should have (competitive):**
- Visual element selector (point-and-click)
- Auto-detect patterns for common sites
- YouTube/Twitter/Reddit API integrations
- JavaScript rendering for modern sites
- Content deduplication
- Export/import configurations

**Defer (v2+):**
- Feed filtering/transformation
- Webhook notifications
- Feed bundling/aggregation

### Architecture Approach

Modular component architecture with clear boundaries:

**Major components:**
1. Web UI Layer — browser interface, visual selector, feed management
2. HTTP API Server — REST endpoints, feed serving
3. Content Fetcher — web scraping with pluggable fetcher interface
4. RSS Builder — XML generation from extracted content
5. Visual Selector Engine — embedded browser for element selection
6. Job Scheduler — background polling with configurable intervals
7. SQLite Database — persistence for feeds, items, jobs, config

**Key patterns:**
- Pluggable fetcher interface (swap between web scraping and API clients)
- Hash-based content deduplication
- Worker pool for concurrent job processing
- Background polling (never fetch synchronously during requests)

### Critical Pitfalls

1. **Site structure changes** — CSS selectors break silently when sites update. Must validate extraction results and monitor for failures.
2. **Invalid RSS feeds** — Use proper library, escape XML, validate timestamps. Never hand-roll XML.
3. **API rate limits** — Implement rate limiting from day one. Track consumption, honor 429 responses, use exponential backoff.
4. **Background job failures** — Use proper job queue with timeouts, retries, and dead letter queues. Jobs must be idempotent.
5. **Brittle selectors** — Visual selector must generate robust selectors (prefer semantic over positional). Provide fallbacks.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Establish data layer and API contract first
**Delivers:** Database schema, HTTP server, Feed CRUD endpoints
**Addresses:** Basic feed management infrastructure
**Avoids:** Building on unstable foundation

### Phase 2: Core Scraping
**Rationale:** Delivers core value proposition
**Delivers:** HTML fetching, CSS selector extraction, RSS XML generation
**Uses:** Cheerio for parsing, feed library for RSS generation
**Implements:** Content Fetcher, RSS Builder components

### Phase 3: Visual Selector
**Rationale:** Key differentiator, improves UX dramatically
**Delivers:** Embedded browser, element click capture, CSS path generation
**Uses:** Puppeteer/Playwright for browser automation
**Note:** System works with manual CSS until this exists

### Phase 4: Automation
**Rationale:** Automation needs stable fetching layer first
**Delivers:** Job queue, interval scheduling, background polling
**Uses:** node-cron or BullMQ
**Avoids:** Pitfall 4 (job failures without recovery)

### Phase 5: Platform Integrations
**Rationale:** Independent enhancements, can ship incrementally
**Delivers:** YouTube, Twitter, Reddit API clients
**Avoids:** Pitfall 3 (rate limit violations)
**Note:** Each platform can be separate sub-phase

### Phase 6: Polish
**Rationale:** Improves experience after core works
**Delivers:** Web UI dashboard, export to XML, monitoring
**Addresses:** User experience, feed management visibility

**Phase ordering rationale:**
- Foundation → Scraping → Visual Selector follows dependency chain
- Automation comes after fetching is stable
- Platform APIs are independent, can parallelize
- Polish at end because system functions without it

**Research flags for phases:**
- Phase 3: Likely needs deeper research (visual selector implementation strategies)
- Phase 5: Needs verification of current API authentication flows (especially Twitter/X)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Based on training data (Jan 2025), versions need verification |
| Features | MEDIUM | RSS standards stable, but competitive landscape may have shifted |
| Architecture | HIGH | Standard patterns for this domain, well-established |
| Pitfalls | HIGH | Domain-specific issues, relatively stable over time |

**Overall confidence:** MEDIUM

### Gaps to Address

- Social API library versions may have changed (especially Twitter/X)
- Visual selector implementation details need phase-specific research
- Platform API authentication flows need current verification
- Puppeteer vs Playwright decision for macOS support

## Sources

**Note:** Research conducted by parallel agents with limited tool access. Findings based on training knowledge (January 2025). Recommend verifying library versions and API status before implementation.

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
