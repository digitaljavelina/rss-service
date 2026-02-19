# Project Research Summary

**Project:** RSS Service — v1.1 Docker & Self-Hosting
**Domain:** Docker containerization + self-hosted PostgreSQL + in-process cron scheduling
**Researched:** 2026-02-18
**Confidence:** HIGH

## Executive Summary

The v1.1 milestone adds a Docker self-hosting layer to an existing, fully-functional Vercel/Supabase RSS service. The app already has all the feed management, content extraction, and platform integration logic it needs — this milestone is purely an infrastructure and runtime adapter layer. Experts building self-hosted Node.js apps in Docker follow a well-documented pattern: multi-stage Dockerfile (TypeScript build stage + slim runtime stage), Docker Compose orchestrating app + PostgreSQL with health-check-gated startup, named volumes for data persistence, and in-process cron (node-cron) replacing the external trigger mechanism Vercel provides. The pattern is mature and all research sources are primary (official docs, package authors' own READMEs).

The single highest-risk element in this milestone is the database client migration. The existing codebase uses `@supabase/supabase-js` throughout — an HTTP client that talks to Supabase's hosted PostgREST API — which cannot connect to a local PostgreSQL container at all. Every route and service that touches the database must be routed through a new environment-switched abstraction layer. The recommended approach is to add a `pg` (node-postgres) Pool path to `src/db/index.ts` behind a `DATABASE_URL` environment variable check, keeping the `supabase` export name so that zero routes require changes. This is the correct approach and must be implemented first, before any other Docker functionality can be validated end-to-end.

The second notable risk is Chromium in Docker. The project currently uses `@sparticuz/chromium` — a Lambda-specific package that actively breaks in a standard Docker container. The fix is straightforward: install system Chromium via `apt-get` in the Dockerfile and point `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` to tell puppeteer-core where to find it. The existing `page-fetcher-browser.ts` already has environment branching logic; adding a Docker branch is low-effort. Docker's 64MB default `/dev/shm` must also be raised to 256MB in the Compose file to prevent Chromium crashes on complex pages.

## Key Findings

### Recommended Stack

The new stack additions for this milestone are minimal and well-chosen. The base image is `node:22-bookworm-slim` (Debian 12) — LTS Node, glibc-based so native modules work, and Chromium available via apt. Alpine is explicitly ruled out because it uses musl libc which breaks `better-sqlite3` (already in the project) and complicates Chromium installation. The PostgreSQL container uses `postgres:16-alpine` — stable LTS version, pg_isready available for healthchecks, small image footprint.

`node-cron` 4.2.1 is chosen for in-process scheduling: zero dependencies, built-in TypeScript types (no `@types/node-cron` needed), and standard cron syntax. `pg` (node-postgres) 8.18.0 is the direct PostgreSQL driver for Docker mode; `@types/pg` 8.16.0 is required separately. Both Vercel and Docker paths are maintained through the same codebase — no forking.

**Core technologies (new additions):**
- `node:22-bookworm-slim` — App container base; LTS, glibc, Chromium available via apt
- `postgres:16-alpine` — Bundled database; stable LTS, minimal footprint, pg_isready included
- `node-cron` 4.2.1 — In-process cron scheduler; zero deps, bundled TS types, standard syntax
- `pg` 8.18.0 + `@types/pg` 8.16.0 — PostgreSQL driver for Docker mode; replaces Supabase JS client in Docker context
- System Chromium via `apt-get` — Replaces `@sparticuz/chromium` in Docker; required, not optional

**Critical version notes:**
- Do NOT use `@sparticuz/chromium` in Docker (Lambda-only package, actively breaks)
- Do NOT use `node:22-alpine` (musl libc breaks existing `better-sqlite3` dependency)
- `node-cron` 4.x bundles its own types — skip `@types/node-cron`

### Expected Features

All P1 features are well-understood with clear implementation paths. No feature in this milestone requires novel problem-solving — all are established Docker patterns applied to this specific codebase.

**Must have (P1 — table stakes):**
- `docker-compose.yml` with `app` + `db` services, named volume, restart policies
- Multi-stage `Dockerfile` (builder: TS compile; runner: slim + system Chromium)
- Local PostgreSQL replacing Supabase as default DB backend (with env-driven abstraction)
- Automatic schema initialization on first `docker-compose up` (via `init-scripts/`)
- Real cron scheduler (`node-cron`) running inside the app container, firing every minute
- `/health` endpoint with DB connectivity check
- `HEALTHCHECK` directive in Dockerfile
- `shm_size: 256m` for Puppeteer in docker-compose.yml
- `.env.docker.example` with all required variables documented
- Graceful SIGTERM handler (stops cron, drains requests, closes DB pool)

**Should have (P2 — add in same milestone if time allows):**
- Non-root Docker user (eliminates need for `--no-sandbox`, improves security posture)
- Structured health response body (`{ status, db, uptime }`)
- Separate `/health/live` vs `/health/ready` endpoints (liveness vs readiness distinction)

**Defer (v2+):**
- Automated PostgreSQL backup sidecar container
- Traefik/nginx reverse proxy configuration examples
- Watchtower auto-update configuration
- `make` convenience targets (up, logs, backup)

### Architecture Approach

The milestone follows a dual-deployment architecture where all business logic (routes, services, feed builders, platform integrations) remains completely unchanged and shared. Only two entry points diverge: `api/index.ts` (Vercel, unchanged) and `src/server.ts` (Docker, gets health endpoint + cron init). Only two factory modules are environment-aware: `src/db/index.ts` (Supabase client vs pg Pool) and `src/services/page-fetcher-browser.ts` (sparticuz vs system Chromium vs local bundled). The scheduler logic is extracted from `api/cron/scheduler.ts` into a new shared `src/cron/scheduler.ts` module that both Vercel and Docker callers import. This eliminates code duplication and prevents divergence.

**Major components (new or modified):**
1. `src/db/index.ts` (modified) — Environment-switched DB client; `DATABASE_URL` present = pg Pool, absent = Supabase JS client. Keeps `supabase` export name so zero routes change.
2. `src/cron/scheduler.ts` (new) — Extracted, environment-agnostic scheduler logic. Called by Vercel HTTP handler and by node-cron timer.
3. `src/server.ts` (modified) — Adds `/health` endpoint, fixed `PORT` env var, node-cron initialization guarded by `!process.env.VERCEL`.
4. `src/services/page-fetcher-browser.ts` (modified) — Third env branch added: Docker path uses `PUPPETEER_EXECUTABLE_PATH` env var to find system Chromium.
5. `Dockerfile` (new) — Two-stage build; system Chromium in runtime stage; non-root user.
6. `docker-compose.yml` (new) — `app` + `db`; `depends_on: condition: service_healthy`; named volume; `shm_size`.
7. `init-scripts/01-schema.sql` (new) — Vanilla PostgreSQL DDL (no Supabase RLS policies); auto-executed by postgres container on first volume mount.

### Critical Pitfalls

Research identified 8 pitfalls. The top 5 by severity and likelihood:

1. **`@sparticuz/chromium` used in Docker** — Will produce cryptic launch failures. Detect Docker via `PUPPETEER_EXECUTABLE_PATH` env var; use system Chromium installed via apt. Must be addressed in the Dockerfile, before any containerized headless testing.

2. **Supabase JS client cannot connect to local PostgreSQL** — The highest-effort code change; must happen first. Add `DATABASE_URL` detection to `src/db/index.ts`, route to pg Pool. Keep `supabase` export name to avoid touching routes. Audit existing Supabase query patterns before starting to scope the effort accurately.

3. **PostgreSQL not ready when app starts** — `depends_on` without `condition: service_healthy` causes crash-restart loops on startup. Always pair with a `pg_isready` healthcheck on the db service AND add retry logic in `initializeDatabase()` as a defensive backup.

4. **Docker `/dev/shm` OOM kills Chromium** — Default 64MB shared memory causes non-deterministic Chromium crashes on complex pages. Add `shm_size: '256m'` to the app service in docker-compose.yml on day one. Do not wait to debug mysterious failures.

5. **Data loss from missing named volume** — Without `volumes:` declaration, PostgreSQL data is ephemeral and destroyed on container rebuild. Always declare a named volume (`postgres_data:/var/lib/postgresql/data`). Verify with `docker volume ls` after first `docker-compose up`.

## Implications for Roadmap

Based on research, this milestone has clear sequential dependencies that dictate phase ordering. The database abstraction must exist before anything can be validated end-to-end in Docker. The Docker infrastructure must exist before cron can be tested. Vercel compatibility must be verified last to confirm nothing regressed.

### Phase 1: Database Abstraction Layer

**Rationale:** The Supabase JS client cannot connect to local PostgreSQL. This is a hard dependency for all other Docker work. Nothing can be tested end-to-end until routes can talk to a local database. This must come first.

**Delivers:** `src/db/index.ts` with environment-switched clients; `src/db/pg-client.ts` pg Pool factory; `init-scripts/01-schema.sql` vanilla DDL; existing routes continue working unchanged via kept `supabase` export name.

**Addresses:** Local PostgreSQL replacing Supabase (P1 must-have), automatic schema initialization (P1 must-have)

**Avoids:** Pitfall 6 (Supabase client cannot connect to local PostgreSQL), Pitfall 7 (data volume not configured)

**Research flag:** Standard patterns — no research-phase needed. The only non-standard element is mapping Supabase query builder syntax to raw SQL. Audit existing query patterns in `src/routes/` and `src/db/` before implementing to scope the effort.

### Phase 2: Docker Infrastructure

**Rationale:** With a working DB abstraction, the Docker infrastructure can be built and validated. This phase produces the actual deployment artifact users will use. Health endpoint and SIGTERM handling belong here as they are prerequisites for the Dockerfile HEALTHCHECK and compose restart behavior.

**Delivers:** `Dockerfile` (multi-stage); `docker-compose.yml` (app + db with healthcheck dependency); `src/server.ts` updated with `/health` endpoint and fixed PORT; graceful SIGTERM handler; `.dockerignore`; `.env.docker.example`.

**Addresses:** docker-compose.yml (P1), multi-stage Dockerfile (P1), /health endpoint (P1), HEALTHCHECK directive (P1), restart policies (P1), shm_size for Puppeteer (P1), .env.example (P1), SIGTERM handler (P1)

**Avoids:** Pitfall 1 (@sparticuz/chromium in Docker), Pitfall 2 (missing Linux system libs for Chromium), Pitfall 3 (root user / --no-sandbox decision), Pitfall 4 (/dev/shm OOM), Pitfall 5 (PostgreSQL not ready at startup)

**Uses:** `node:22-bookworm-slim`, `postgres:16-alpine`, system Chromium via apt, `pg_isready` healthcheck, `shm_size: 256m`

**Research flag:** Standard patterns — no research-phase needed. Use the Dockerfile and docker-compose.yml templates from STACK.md and ARCHITECTURE.md directly.

### Phase 3: In-Process Cron Scheduling

**Rationale:** Cron depends on a working Docker container (Phase 2) and working database connection (Phase 1). The scheduler logic extraction is low-risk since the business logic already exists in `api/cron/scheduler.ts` — it just needs to be decoupled from Vercel's HTTP trigger mechanism.

**Delivers:** `src/cron/scheduler.ts` (extracted, environment-agnostic refresh logic); `src/server.ts` updated with node-cron initialization (`!process.env.VERCEL` guard); `api/cron/scheduler.ts` updated to import shared logic (Vercel path unchanged); `node-cron` and `pg` added to package.json.

**Addresses:** Real cron scheduling (P1 must-have — the core purpose of this milestone)

**Avoids:** Pitfall 8 (cron architecture change — Vercel HTTP handler auth check stays in `api/cron/`, not in shared logic)

**Uses:** `node-cron` 4.2.1 (bundled types, no @types/node-cron needed)

**Research flag:** Standard patterns — no research-phase needed. The cron extraction pattern is documented in ARCHITECTURE.md with concrete code examples.

### Phase 4: Verification and Dual-Deployment Parity

**Rationale:** After Phases 1-3, the Docker deployment needs end-to-end smoke testing and — critically — Vercel compatibility must be confirmed unbroken. The DB abstraction layer must correctly branch for both env configurations, and both must work without cross-contamination.

**Delivers:** Confirmed working `docker-compose up --build` from a fresh clone; feeds created and persisting across restarts; cron firing and refreshing feeds on schedule; headless browser feeds working; Vercel deploy confirmed still working with Supabase env vars; P2 features added if time permits (non-root user, structured health response).

**Addresses:** Dual deployment parity, environment isolation, all items on PITFALLS.md "Looks Done But Isn't" checklist

**Avoids:** Silent regressions in Vercel path; data loss from untested volume persistence; Chromium working only on simple pages

**Research flag:** No research needed. This is a verification phase using the "Looks Done But Isn't" checklist from PITFALLS.md as the test script.

### Phase Ordering Rationale

- **DB abstraction first:** Hard dependency. Nothing runs in Docker without it.
- **Docker infrastructure second:** Produces the testable artifact; health endpoint is a prerequisite for `depends_on: service_healthy`.
- **Cron third:** Depends on both working database and running container; lowest risk since logic already exists.
- **Verification last:** Confirms the system as a whole, including Vercel regression check and edge-case Chromium validation.

This ordering matches the dependency graph in FEATURES.md: `[Real Cron Scheduling] → requires → [Local PostgreSQL] → requires → [DB Schema Auto-init]`.

### Research Flags

Phases needing deeper research during planning:
- None identified. All 4 phases use well-documented patterns with concrete code examples already provided in ARCHITECTURE.md and STACK.md.

Phases with standard patterns (skip research-phase):
- **Phase 1 (DB Abstraction):** pg Pool setup is extensively documented; Supabase-compatible interface wrapper pattern is in ARCHITECTURE.md.
- **Phase 2 (Docker Infrastructure):** Multi-stage Dockerfile + Compose healthcheck patterns are canonical; complete examples in research files.
- **Phase 3 (Cron Scheduling):** node-cron is zero-config; extraction pattern has concrete code in ARCHITECTURE.md.
- **Phase 4 (Verification):** Checklist-driven; no unknowns.

**One planning-time investigation recommended before Phase 1:** Audit all existing query patterns in `src/routes/` and `src/db/` to count and categorize Supabase query builder calls (`.from().select()`, `.insert()`, `.update()`, `.delete()`, `.upsert()`). This scopes Phase 1 effort precisely. It is a 30-minute code read, not a research phase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via npm registry; official docs consulted for all major decisions; @sparticuz/chromium Docker unsuitability confirmed by the package authors' own README |
| Features | HIGH | Domain (Node.js + Docker + Postgres) is mature; Miniflux and FreshRSS used as reference implementations; table stakes list is exhaustive and prioritized |
| Architecture | HIGH | Based on direct inspection of the existing codebase; all architectural patterns have concrete code examples; dual-deployment boundary is clearly defined |
| Pitfalls | HIGH | All pitfalls verified against official docs or primary sources (Puppeteer troubleshooting, Docker official docs, node-postgres docs); failure modes are specific with confirmed reproductions |

**Overall confidence:** HIGH

### Gaps to Address

- **Chromium version compatibility:** `puppeteer-core@24.37.3` requires a specific Chrome for Testing revision. System Chromium from Debian Bookworm apt may not match exactly. STACK.md notes this: if there is a version mismatch causing issues, fall back to Puppeteer's `installBrowsers` or Google's Chrome apt repository instead of the Debian package. Treat this as a conditional during Phase 2 — test `/usr/bin/chromium --version` against puppeteer-core's expected revision and adjust if needed.

- **Supabase query surface area:** The exact scope of the DB abstraction in Phase 1 depends on how many distinct Supabase query patterns exist in the routes. The research assumes straightforward CRUD calls, but complex queries (RPC calls, `.match()`, `.contains()`, nested filters) would increase effort. Audit `src/routes/` and `src/db/` before starting Phase 1.

- **Static file paths in Docker:** PITFALLS.md flags that `express.static('public')` with a relative path can break when the CWD inside Docker differs from expected. This is a quick fix (`path.join(__dirname, '../public')`) but must be caught during Phase 4 smoke testing if not addressed earlier.

- **`@sparticuz/chromium` import in production bundle:** The current code imports `@sparticuz/chromium` conditionally. In Docker, this import path still exists in the bundle. Confirm that the conditional import (`if (process.env.VERCEL)`) prevents the package from being evaluated at load time, or use dynamic `import()` to ensure it only loads on the Vercel path.

## Sources

### Primary (HIGH confidence)
- [Puppeteer Docker Guide (official)](https://pptr.dev/guides/docker) — base image pattern, required flags, non-root user
- [puppeteer/puppeteer Dockerfile on GitHub](https://github.com/puppeteer/puppeteer/blob/main/docker/Dockerfile) — official team Dockerfile pattern
- [@sparticuz/chromium GitHub README](https://github.com/Sparticuz/chromium) — explicit statement that Docker users should use distro packages
- [Docker Compose startup order (official)](https://docs.docker.com/compose/how-tos/startup-order/) — `condition: service_healthy` pattern
- [Docker Volumes official docs](https://docs.docker.com/engine/storage/volumes/) — named volume behavior and persistence
- [node-postgres Pool docs](https://node-postgres.com/features/pooling) — Pool configuration, connection leak prevention
- [node-cron npm](https://www.npmjs.com/package/node-cron) — v4.2.1, built-in types confirmed via `npm info`
- [pg npm](https://www.npmjs.com/package/pg) — v8.18.0, no bundled types confirmed via `npm info`
- [Puppeteer troubleshooting](https://pptr.dev/troubleshooting) — `--disable-dev-shm-usage` flag, system library requirements
- [Puppeteer GitHub issues — /dev/shm OOM](https://github.com/puppeteer/puppeteer/issues/5846) — 64MB failure mode confirmed

### Secondary (MEDIUM confidence)
- [Supabase Postgres.js docs](https://supabase.com/docs/guides/database/postgres-js) — pg and postgres.js both supported for direct connections
- [Docker /dev/shm configuration](https://last9.io/blog/how-to-configure-dockers-shared-memory-size-dev-shm/) — 256MB recommendation
- [LogRocket Node.js schedulers comparison](https://blog.logrocket.com/comparing-best-node-js-schedulers/) — node-cron vs BullMQ tradeoffs
- [Goldbergyoni Node.js best practices — graceful shutdown](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/docker/graceful-shutdown.md) — SIGTERM handler pattern
- [Miniflux Docker deployment](https://miniflux.app/) — reference implementation for self-hosted RSS Docker patterns
- [BetterStack Dockerize Node.js guide](https://betterstack.com/community/guides/scaling-nodejs/dockerize-nodejs/) — Node.js + PostgreSQL Compose patterns

---
*Research completed: 2026-02-18*
*Ready for roadmap: yes*
