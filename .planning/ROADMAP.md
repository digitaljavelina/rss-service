# Roadmap: RSS Service

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-02-18)
- 🚧 **v1.1 Docker & Self-Hosting** — Phases 7-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-02-18</summary>

- [x] Phase 1: Foundation & Setup (4/4 plans) — completed 2026-02-17
- [x] Phase 2: Core Feed Creation (5/5 plans) — completed 2026-02-17
- [x] Phase 3: Feed Management (4/4 plans) — completed 2026-02-17
- [x] Phase 4: Advanced Extraction (3/3 plans) — completed 2026-02-18
- [x] Phase 5: Automation & Scheduling (5/5 plans) — completed 2026-02-18
- [x] Phase 6: Platform Integrations (5/5 plans) — completed 2026-02-18

</details>

### 🚧 v1.1 Docker & Self-Hosting (In Progress)

**Milestone Goal:** Containerize the service for self-hosted deployment with bundled PostgreSQL and real cron scheduling, while keeping Vercel as a dev/preview option.

- [x] **Phase 7: Database Abstraction Layer** — Environment-switched DB client so the app can talk to local PostgreSQL or Supabase depending on deployment (completed 2026-02-19)
- [ ] **Phase 8: Docker Infrastructure** — Multi-stage Dockerfile, Docker Compose with bundled PostgreSQL, health endpoint, graceful shutdown, and system Chromium
- [ ] **Phase 9: In-Process Cron Scheduling** — node-cron fires feed refreshes at configured intervals inside the container, replacing the Vercel cron trigger
- [ ] **Phase 10: Verification and Dual-Deployment Parity** — End-to-end smoke test confirming Docker works from a fresh clone and Vercel remains unbroken

## Phase Details

### Phase 7: Database Abstraction Layer
**Goal**: The app can connect to a local PostgreSQL container using the same routes and services, with zero code changes required in route handlers
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: DB-01, DB-02
**Success Criteria** (what must be TRUE):
  1. Running `docker-compose up` starts the app connected to the bundled PostgreSQL container — no Supabase credentials required
  2. All existing feed routes (list, create, edit, delete, refresh) work identically against local PostgreSQL as they do against Supabase
  3. Setting `DATABASE_URL` routes the app to pg Pool; omitting it falls back to the Supabase JS client — confirmed by starting the app in both configurations
  4. On first `docker-compose up` against a fresh volume, the feeds, items, and settings tables are created automatically with no manual SQL required
**Plans**: 2 plans
  - [ ] 07-01-PLAN.md — pg adapter with chainable query builder + environment-dispatched index.ts
  - [ ] 07-02-PLAN.md — SQL migrations, Docker init scripts, schema.ts with backoff + migration runner

### Phase 8: Docker Infrastructure
**Goal**: A single `docker-compose up --build` command produces a running, healthy RSS service with bundled PostgreSQL, headless browser support, and container-level health monitoring
**Depends on**: Phase 7
**Requirements**: CNTR-01, CNTR-02, CNTR-03, CNTR-04, CNTR-05, HLTH-01, HLTH-02, HLTH-03, HLTH-04, BRWS-01
**Success Criteria** (what must be TRUE):
  1. `docker-compose up --build` from a fresh clone completes without error and the app is reachable at the configured port
  2. `GET /health` returns a JSON response containing status, db connectivity confirmation, and uptime — and returns a non-200 status when the database is unreachable
  3. Sending SIGTERM to the container causes it to finish in-flight requests, stop the scheduler, close the DB pool, and exit cleanly — confirmed via `docker stop` with no error logs
  4. Headless browser feed extraction works inside the container — a JavaScript-heavy site produces extracted items without crashing Chromium
  5. `.env.docker.example` documents every required environment variable so a new user can configure the deployment without reading source code
**Plans**: TBD

### Phase 9: In-Process Cron Scheduling
**Goal**: Feeds refresh automatically inside the Docker container at their configured intervals, with no external cron trigger required
**Depends on**: Phase 8
**Requirements**: CRON-01
**Success Criteria** (what must be TRUE):
  1. A feed configured with a 15-minute refresh interval is automatically refreshed every 15 minutes while the container is running — confirmed by watching updated `last_fetched_at` timestamps in the database
  2. The Vercel cron path (`api/cron/scheduler.ts` HTTP handler) continues to work unchanged — both deployment modes call the same underlying scheduler logic
  3. Stopping and restarting the container resumes cron scheduling automatically on startup with no manual intervention
**Plans**: TBD

### Phase 10: Verification and Dual-Deployment Parity
**Goal**: The Docker deployment works correctly end-to-end from a fresh clone, and the Vercel deployment remains fully functional — both paths confirmed before the milestone closes
**Depends on**: Phase 9
**Requirements**: (verification phase — all v1.1 requirements exercised, none uniquely owned)
**Success Criteria** (what must be TRUE):
  1. A complete `docker-compose down -v && docker-compose up --build` cycle from a fresh clone results in a fully operational RSS service with persistent data surviving a subsequent restart
  2. The Vercel deployment (`vercel dev` or deployed preview) continues to work with Supabase env vars — feed creation, refresh, and serving all function correctly
  3. A feed that uses the headless browser path produces items correctly in Docker — confirming system Chromium replaces @sparticuz/chromium without regression
  4. Feed data persists across container rebuilds — items created before `docker-compose up --build` still exist after
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Setup | v1.0 | 4/4 | Complete | 2026-02-17 |
| 2. Core Feed Creation | v1.0 | 5/5 | Complete | 2026-02-17 |
| 3. Feed Management | v1.0 | 4/4 | Complete | 2026-02-17 |
| 4. Advanced Extraction | v1.0 | 3/3 | Complete | 2026-02-18 |
| 5. Automation & Scheduling | v1.0 | 5/5 | Complete | 2026-02-18 |
| 6. Platform Integrations | v1.0 | 5/5 | Complete | 2026-02-18 |
| 7. Database Abstraction Layer | 2/2 | Complete   | 2026-02-19 | - |
| 8. Docker Infrastructure | v1.1 | 0/TBD | Not started | - |
| 9. In-Process Cron Scheduling | v1.1 | 0/TBD | Not started | - |
| 10. Verification and Dual-Deployment Parity | v1.1 | 0/TBD | Not started | - |

---

*Full v1.0 details: `milestones/v1.0-ROADMAP.md`*
*Last updated: 2026-02-18 (v1.1 roadmap created)*
