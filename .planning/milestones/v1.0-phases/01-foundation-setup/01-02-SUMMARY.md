---
phase: 01-foundation-setup
plan: 02
subsystem: server
tags: [express, nodejs, rss, atom, feed, caching, content-negotiation]

# Dependency graph
requires:
  - phase: 01-foundation-setup
    plan: 01
    provides: database layer with feeds and items tables
provides:
  - Express server with auto-port selection
  - Feed serving at /feeds/:identifier
  - Content negotiation (RSS 2.0 / Atom 1.0)
  - In-memory feed caching with TTL
  - Response caching headers (Cache-Control, ETag)
affects: [03-feed-crud, 04-web-scraping, all-phases]

# Tech tracking
tech-stack:
  added: [feed]
  patterns: [Express middleware chain, in-memory caching with TTL, content negotiation via Accept header, ETag generation from content hash]

key-files:
  created: [src/app.ts, src/server.ts, src/routes/index.ts, src/routes/feeds.ts, src/services/feed-builder.ts, src/services/feed-cache.ts]
  modified: []

key-decisions:
  - "Default to RSS 2.0 format for maximum compatibility"
  - "In-memory cache with 5-minute TTL (simple, effective for single-user)"
  - "ETag generation from MD5 content hash for client-side validation"
  - "Auto-port selection from 3000-3100 range to avoid conflicts"
  - "Content negotiation via Accept header parsing (not res.format for better control)"

patterns-established:
  - "Express app separated from server startup for testability"
  - "Router modularization (main router mounts sub-routers)"
  - "Service layer for business logic (feed-builder, feed-cache)"
  - "Cache invalidation by feed identifier (supports both slug and ID)"
  - "Consistent error handling (404 for not found, 500 for server errors)"

# Metrics
duration: 4min
completed: 2026-02-16
---

# Phase 1 Plan 2: Express Server & Feed Serving Summary

**One-liner:** Express server with RSS/Atom feed serving, content negotiation, and in-memory caching with proper HTTP headers.

## What Was Built

### Core Infrastructure
- **Express Application** (src/app.ts)
  - Middleware chain: compression, JSON parsing, URL-encoded forms, static files
  - Health check endpoint at GET /
  - Modular router architecture

- **Server Startup** (src/server.ts)
  - Auto-port selection (3000-3100 range) using get-port
  - Database initialization on startup
  - Pino logging for structured logs
  - Graceful error handling

- **Feed Serving** (src/routes/feeds.ts)
  - GET /feeds/:identifier endpoint
  - Content negotiation via Accept header
  - Defaults to RSS 2.0 (most compatible)
  - Explicit Atom support via Accept: application/atom+xml
  - ETag generation from content hash
  - Cache-Control: public, max-age=300 (5 minutes)
  - 404 handling for non-existent feeds

### Service Layer
- **Feed Builder** (src/services/feed-builder.ts)
  - Generates RSS 2.0 or Atom 1.0 XML using 'feed' library
  - Queries feeds table by slug OR id (flexible lookup)
  - Queries items with pub_date DESC ordering
  - Respects feed.item_limit for pagination
  - Cache-aware (checks cache before building)

- **Feed Cache** (src/services/feed-cache.ts)
  - In-memory Map-based cache
  - TTL: 5 minutes (300 seconds)
  - Cache key format: "identifier:format" (e.g., "my-feed:rss2")
  - Automatic expiration checking
  - Invalidation API for both RSS and Atom formats

## Technical Approach

### Content Negotiation
Implemented simple Accept header parsing instead of res.format() for better control:
- Accept: application/atom+xml → Atom 1.0
- Accept: application/rss+xml → RSS 2.0
- Accept: */* or missing → RSS 2.0 (default)

This ensures RSS is the default format for maximum feed reader compatibility.

### Caching Strategy
Two-layer caching:
1. **Server-side cache:** In-memory with 5-minute TTL (reduces database queries)
2. **Client-side cache:** Cache-Control + ETag headers (reduces network traffic)

ETag generated from MD5 hash of XML content enables If-None-Match conditional requests (304 responses).

### Port Selection
Using get-port with portNumbers(3000, 3100) ensures:
- Development server starts even if port 3000 is busy
- Avoids manual port conflicts
- Range of 100 ports provides flexibility

## Testing Performed

1. **Server startup:** Verified logs show correct port and database initialization
2. **Health check:** GET / returns {"status":"ok"}
3. **RSS format:** Default and explicit Accept header both work
4. **Atom format:** Accept: application/atom+xml returns proper Atom XML
5. **Response headers:** Verified Content-Type, Cache-Control, ETag
6. **404 handling:** Non-existent feed returns 404 JSON error
7. **Feed lookup:** Both slug and ID work as identifiers
8. **Port auto-selection:** Multiple servers can start simultaneously on different ports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] get-port import syntax**
- **Found during:** Task 1 verification
- **Issue:** Import statement used named export `{ getPort }` but get-port uses default export
- **Fix:** Changed to `import getPort, { portNumbers } from 'get-port'`
- **Files modified:** src/server.ts
- **Commit:** fcb1ea7

**2. [Rule 3 - Blocking] Placeholder feeds router**
- **Found during:** Task 1 implementation
- **Issue:** src/routes/index.ts imports feedsRouter but Task 1 didn't create it yet
- **Fix:** Created placeholder src/routes/feeds.ts with 404 response (to be replaced in Task 2)
- **Files modified:** src/routes/feeds.ts
- **Commit:** fcb1ea7 (part of Task 1)

**3. [Rule 1 - Bug] res.format() picks first matching format**
- **Found during:** Task 2 verification
- **Issue:** Express res.format() with Accept: */* picks first format (Atom) instead of default
- **Fix:** Replaced res.format() with explicit Accept header parsing and conditional logic
- **Files modified:** src/routes/feeds.ts
- **Commit:** 4df425d

## Success Criteria Status

- [x] Express server runs and auto-selects available port
- [x] /feeds/:identifier serves RSS 2.0 by default (OUT-01)
- [x] Content-Type header is application/rss+xml or application/atom+xml (OUT-02)
- [x] Cache-Control header enables client-side caching (OUT-04)
- [x] Content negotiation works via Accept header
- [x] 404 returned for non-existent feeds
- [x] Both slug and ID URLs work for feed lookup

## Key Files Created

**Server Infrastructure:**
- `src/app.ts` - Express application with middleware
- `src/server.ts` - Server startup with port selection
- `src/routes/index.ts` - Main router with health check
- `src/routes/feeds.ts` - Feed serving endpoint

**Service Layer:**
- `src/services/feed-builder.ts` - RSS/Atom XML generation
- `src/services/feed-cache.ts` - In-memory caching with TTL

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Default to RSS 2.0 | Most feed readers support RSS, Atom is less universal | High - ensures compatibility |
| In-memory cache | Simple, fast, sufficient for single-user local app | Medium - won't scale to multi-user |
| 5-minute TTL | Balances freshness with cache hit rate | Low - can adjust based on usage |
| Accept header parsing | res.format() didn't provide proper default handling | Low - more explicit control |
| ETag from MD5 hash | Fast to compute, good distribution, sufficient for cache validation | Medium - enables 304 responses |

## Next Phase Readiness

**Ready to proceed:** Yes

**Blockers:** None

**Required for Phase 1-03 (Feed CRUD):**
- [x] Express server running
- [x] Feed serving endpoint exists
- [x] Database layer initialized
- [x] Service layer structure established

**Notes for next plan:**
- Feed CRUD will need to call `invalidateFeed()` after updates
- Consider adding /api/feeds endpoints for JSON CRUD operations
- Server is now ready for web scraping integration (Phase 1-04)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | fcb1ea7 | Express application and server startup |
| 2 | 4df425d | Feed serving with content negotiation and caching |

---

**Plan completed:** 2026-02-16
**Execution time:** 4 minutes
**Deviations:** 3 (all auto-fixed)
**Test coverage:** Manual verification (7 test scenarios)
