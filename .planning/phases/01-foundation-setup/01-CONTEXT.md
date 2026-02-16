# Phase 1: Foundation & Setup - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

User can access a running web application with persistent storage and feed serving capability. This phase establishes the foundation — no feed creation yet, but the shell is ready to serve feeds and persist data.

</domain>

<decisions>
## Implementation Decisions

### Visual Style & App Shell
- Clean & minimal aesthetic, like Linear or Notion
- Sidebar navigation (always visible)
- Light and dark mode with user toggle
- Quick-start wizard on first visit (get users to value fast)

### Feed URL Structure
- Human-readable slugs when user provides a name: `/feeds/hacker-news-top`
- Generated ID always works as fallback: `/feeds/f7k2m9`
- Both formats resolve to the same feed

### Error Presentation
- Inline errors for form validation and direct user actions
- Toast notifications for background issues (fetch failures, etc.)
- Context-appropriate — errors appear where they make sense

### Feed Serving
- Light caching (balance of speed and freshness)
- Auto-detect format from client request headers (RSS 2.0 or Atom)
- Public URLs, no authentication required (works with all readers)
- Default 100 items per feed (configurable)

### Database & Storage
- SQLite database at `./data/rss-service.db`
- All configuration stored in database (single source of truth)
- Auto-create database silently on first run
- Auto-find available port if 3000 is taken

### Claude's Discretion
- Specific UI component library choice
- Exact caching TTL values
- Toast notification timing and positioning
- Sidebar width and collapse behavior
- Color palette within clean/minimal aesthetic

</decisions>

<specifics>
## Specific Ideas

- "Like Linear or Notion" — reference for visual style
- Quick-start wizard should get users to creating their first feed immediately
- Sidebar always visible for consistent navigation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-setup*
*Context gathered: 2026-02-16*
