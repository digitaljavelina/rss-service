# Requirements: RSS Service

**Defined:** 2026-02-18
**Core Value:** Create RSS feeds from anything. Point at any URL, auto-detect content patterns, and get a feed you can subscribe to in your reader.

## v1.1 Requirements

Requirements for Docker & Self-Hosting milestone. Each maps to roadmap phases.

### Containerization

- [ ] **CNTR-01**: App builds via multi-stage Dockerfile (TypeScript compile stage + slim runtime stage)
- [ ] **CNTR-02**: Docker Compose orchestrates app and PostgreSQL with named volumes, restart policies, and healthcheck-gated startup
- [ ] **CNTR-03**: .env.docker.example documents all required environment variables for Docker deployment
- [ ] **CNTR-04**: .dockerignore excludes unnecessary files from Docker build context
- [ ] **CNTR-05**: Container runs as non-root user (eliminates --no-sandbox for Chromium)

### Database

- [ ] **DB-01**: App uses pg Pool when DATABASE_URL is set, Supabase JS client otherwise — existing routes unchanged
- [ ] **DB-02**: PostgreSQL schema initializes automatically on first docker-compose up via init-scripts

### Health & Reliability

- [ ] **HLTH-01**: /health endpoint checks DB connectivity and returns structured JSON (status, db, uptime)
- [ ] **HLTH-02**: Dockerfile includes HEALTHCHECK directive
- [ ] **HLTH-03**: App handles SIGTERM gracefully — stops cron, drains requests, closes DB pool
- [ ] **HLTH-04**: Docker Compose configures shm_size 256MB for Chromium stability

### Scheduling

- [ ] **CRON-01**: In-process node-cron scheduler fires feed refreshes at configured intervals in Docker mode

### Browser

- [ ] **BRWS-01**: Headless browser uses system Chromium in Docker via PUPPETEER_EXECUTABLE_PATH (replaces @sparticuz/chromium)

## Future Requirements

Deferred to v2+. Tracked but not in current roadmap.

### Operations

- **OPS-01**: Automated PostgreSQL backup sidecar container
- **OPS-02**: Traefik/nginx reverse proxy configuration examples
- **OPS-03**: Watchtower auto-update configuration
- **OPS-04**: Make convenience targets (up, logs, backup)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Docker Secrets | Overkill for single-user app, breaks standard Compose workflow |
| Separate cron container | Introduces distributed state problem for no benefit |
| Redis/BullMQ job queue | Unnecessary third container for single-user service |
| Kubernetes/Docker Swarm | Way beyond scope — single container + restart is sufficient |
| Multi-replica HA | User chose single container + auto-restart over orchestrated replicas |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CNTR-01 | — | Pending |
| CNTR-02 | — | Pending |
| CNTR-03 | — | Pending |
| CNTR-04 | — | Pending |
| CNTR-05 | — | Pending |
| DB-01 | — | Pending |
| DB-02 | — | Pending |
| HLTH-01 | — | Pending |
| HLTH-02 | — | Pending |
| HLTH-03 | — | Pending |
| HLTH-04 | — | Pending |
| CRON-01 | — | Pending |
| BRWS-01 | — | Pending |

**Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 0
- Unmapped: 13 (pending roadmap creation)

---
*Requirements defined: 2026-02-18*
*Last updated: 2026-02-18 after initial definition*
