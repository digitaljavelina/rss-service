# Phase 7: Database Abstraction Layer - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Environment-switched DB client so the app can talk to local PostgreSQL or Supabase depending on deployment. Routes and services require zero code changes. `DATABASE_URL` present routes to pg Pool; absent falls back to Supabase JS client. Tables auto-created on first `docker-compose up`.

</domain>

<decisions>
## Implementation Decisions

### Abstraction depth
- Unsupported query patterns should degrade gracefully: log a warning and return empty/null rather than crashing the app
- Both Supabase and local PG paths should be equally easy to develop against — no preferred default

### Schema management
- Auto-migrate on startup: detect outdated schema and apply pending migrations automatically, no manual intervention required
- App should check schema version and apply any missing migrations before serving requests

### Dev workflow
- Both backends equally supported — neither is "primary" or "secondary"
- Backend confirmation (which DB connected) logged at debug level only, not shown by default in normal startup output

### Error & fallback behavior
- API consumers receive categorized errors (e.g., `database_unavailable`, `query_failed`) — never raw SQL details or generic 500s
- Startup: retry connection with exponential backoff (~30 seconds) before giving up if DB is unreachable
- Mid-operation: auto-reconnect via pool — lost connections recovered transparently, failed in-flight queries return errors but subsequent queries work

### Claude's Discretion
- API surface shape: whether to mimic Supabase's chainable `.from().select()` API or create a neutral interface (decide after codebase audit)
- Abstraction scope: implement only patterns currently used vs. broader coverage (decide after auditing route query patterns)
- Schema approach: raw SQL migration files vs. migration library vs. programmatic creation
- Schema evolution strategy: additive migrations vs. single source of truth
- Schema parity level: exact Supabase match vs. functionally equivalent
- Debug/query logging: whether to include a DB_DEBUG mode
- Env switching mechanism: separate .env files vs. single file with toggle
- Testing strategy: test both backends or trust the abstraction
- Error parity: identical error shapes from both backends vs. similar but not exact

</decisions>

<specifics>
## Specific Ideas

- "Both equally" for dev workflow — strong signal that the abstraction quality must be high enough that a developer genuinely doesn't care which backend is active
- Categorized errors suggest a middleware or error-normalization layer between raw DB responses and API output

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-database-abstraction-layer*
*Context gathered: 2026-02-18*
