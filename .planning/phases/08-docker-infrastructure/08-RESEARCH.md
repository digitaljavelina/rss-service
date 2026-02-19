# Phase 8: Docker Infrastructure - Research

**Researched:** 2026-02-18
**Domain:** Docker multi-stage builds, Chromium in containers, health endpoints, graceful shutdown, in-process cron scheduling
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CNTR-01 | App builds via multi-stage Dockerfile (TypeScript compile stage + slim runtime stage) | Multi-stage pattern: `builder` compiles TS → `dist/`; `production` copies `dist/` + runs `npm ci --omit=dev` + installs system Chromium. Node 22 bookworm-slim is the required base. |
| CNTR-02 | Docker Compose orchestrates app and PostgreSQL with named volumes, restart policies, and healthcheck-gated startup | Extend `docker/docker-compose.yml` with `app` service; `depends_on: postgres: condition: service_healthy`; postgres service already exists with healthcheck. Move to project root. |
| CNTR-03 | `.env.docker.example` documents all required environment variables for Docker deployment | New file at project root; documents `DATABASE_URL`, `PORT`, `NODE_ENV`, `BASE_URL`, `PUPPETEER_EXECUTABLE_PATH`, and optionally `CRON_SECRET`. |
| CNTR-04 | `.dockerignore` excludes unnecessary files from Docker build context | Exclude `node_modules`, `.env*`, `dist`, `.git`, `*.md`, `data/`, `.planning/`. Keep `package.json`, `package-lock.json`, `src/`, `public/`, `tsconfig.json`. |
| CNTR-05 | Container runs as non-root user (eliminates `--no-sandbox` for Chromium) | Create `pptruser` group + user in Dockerfile; `USER pptruser` before CMD; add to `audio,video` groups per Puppeteer official guidance. `--no-sandbox` still required in Docker even as non-root (kernel namespace constraint in containers). |
| HLTH-01 | `/health` endpoint checks DB connectivity and returns structured JSON (status, db, uptime) | Add to `src/app.ts` or `src/server.ts`; call `PgAdapter.getInstance().getPool().query('SELECT 1')` in pg mode; return `{ status: 'ok', db: 'connected', uptime: process.uptime() }`; return 503 if DB unreachable. |
| HLTH-02 | Dockerfile includes HEALTHCHECK directive | `HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD node -e "..."` — inline Node.js HTTP request to avoid curl dependency. |
| HLTH-03 | App handles SIGTERM gracefully — stops cron, drains requests, closes DB pool | `process.on('SIGTERM', ...)` → `task.stop()` → `server.close(() => PgAdapter.getInstance().shutdown())` → `process.exit(0)`. Timeout fallback after 10s. |
| HLTH-04 | Docker Compose configures `shm_size: 256mb` for Chromium stability | Add to `app` service in docker-compose.yml — prevents "No space left on device" crashes from Docker's default 64MB `/dev/shm`. |
| BRWS-01 | Headless browser uses system Chromium in Docker via `PUPPETEER_EXECUTABLE_PATH` (replaces `@sparticuz/chromium`) | Update `src/services/page-fetcher-browser.ts` `getBrowser()` to branch on `PUPPETEER_EXECUTABLE_PATH`. Debian Bookworm apt chromium 145.x matches puppeteer-core 24.37.3's expected Chrome 145. |
</phase_requirements>

---

## Summary

Phase 8 takes the fully-operational Phase 7 stack (pg adapter, migrations, Docker postgres service) and wraps it in a complete self-hosting experience. The deliverables split naturally into three clusters: container build (Dockerfile + .dockerignore + docker-compose.yml extension), runtime wiring (health endpoint, SIGTERM handler, Chromium path, node-cron scheduler), and documentation (.env.docker.example).

The highest-complexity item is the **in-process cron scheduler** (`src/services/scheduler.ts` + `node-cron`). The feed refresh logic already exists in `src/routes/api/feeds.ts` (the manual refresh endpoint is ~200 lines). The scheduler must extract that logic into a shared function and call it on a timer. This is the only item requiring significant new code beyond wiring.

The **Chromium compatibility** concern from prior decisions is resolved: Debian Bookworm apt provides Chromium 145.0.7632.75, which exactly matches puppeteer-core 24.37.3's expected revision of 145.0.7632.67. The version skew is within the same milestone release and is safe to use.

**Primary recommendation:** Implement in two plans — Plan 08-01: container foundation (Dockerfile, docker-compose, .dockerignore, .env.docker.example, health endpoint, SIGTERM, Chromium path); Plan 08-02: in-process cron scheduler (extract refresh logic, wire node-cron, integrate into SIGTERM sequence).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:22-bookworm-slim` | Node 22 LTS | App container base image | Debian glibc required for `better-sqlite3`; bookworm has Chromium 145 in apt; slim keeps image lean |
| `postgres:16-bookworm` | PostgreSQL 16 | DB container | Already decided in Phase 7; bookworm for consistency |
| `node-cron` | 4.x (latest) | In-process cron scheduling | Zero dependencies, built-in TypeScript types, ESM import supported, `task.stop()` for graceful shutdown |

### Supporting (Already in package.json)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `puppeteer-core` | 24.37.3 | Headless browser | Already installed; needs `executablePath` set to system Chromium in Docker |
| `pg` | 8.18.0 | PostgreSQL client | Already installed from Phase 7; `PgAdapter.shutdown()` closes pool |
| `pino` | 10.x | Structured logging | Already installed; use throughout new scheduler |

### New Installation Required
```bash
npm install node-cron
# node-cron 4.x ships its own TypeScript types — no @types/node-cron needed
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node-cron` | `croner` | croner is faster and has more features but node-cron is sufficient; both have built-in types |
| `node-cron` | `node-schedule` | node-schedule has `.gracefulShutdown()` but uses more complex date patterns; overkill here |
| System Chromium (apt) | `@sparticuz/chromium` | `@sparticuz/chromium` is Lambda-only; its own README says use distro packages in Docker |

---

## Architecture Patterns

### Recommended Project Structure (Phase 8 additions)

```
RSS-Service/
├── src/
│   ├── server.ts                  # MODIFY: add PORT env, health route, SIGTERM, node-cron start
│   ├── services/
│   │   ├── page-fetcher-browser.ts    # MODIFY: add Docker Chromium path
│   │   └── scheduler.ts               # NEW: extracted feed refresh logic for node-cron
│   └── ... (unchanged)
├── docker/
│   └── docker-compose.yml         # EXISTS (postgres only) — Phase 8 may move to root or extend
├── Dockerfile                     # NEW — project root
├── docker-compose.yml             # NEW — project root (full app + db orchestration)
├── .dockerignore                  # NEW — project root
└── .env.docker.example            # NEW — project root
```

**Note on docker-compose location:** The existing `docker/docker-compose.yml` is postgres-only (Phase 7). Phase 8 creates `docker-compose.yml` at the project root with both services. The Phase 7 file in `docker/` can be kept for development reference or superseded by the root file.

### Pattern 1: Multi-Stage Dockerfile

**What:** Two FROM stages. Stage 1 (`builder`) installs all deps including devDeps, runs `npm run build` to produce `dist/`. Stage 2 (`production`) starts fresh from slim base, installs system Chromium, copies `dist/` and runs `npm ci --omit=dev`.

**Why two stages:** Without them, the final image includes `typescript`, `tsx`, `puppeteer` (full, not core), `@vercel/node`, and all devDeps — roughly 2-3x larger.

**Example:**
```dockerfile
# Stage 1: TypeScript compilation
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:22-bookworm-slim AS production

# System Chromium (Debian Bookworm apt provides Chromium 145 — matches puppeteer-core 24.37.3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libfontconfig1 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Production deps only (no devDeps)
COPY package*.json ./
RUN npm ci --omit=dev

# Compiled app
COPY --from=builder /app/dist ./dist

# Static assets (referenced by express.static at runtime)
COPY public ./public

# Non-root user (Puppeteer best practice; see CNTR-05)
RUN groupadd -r pptruser && useradd -rm -g pptruser -G audio,video pptruser
USER pptruser

ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3000

# Inline Node.js health check — avoids curl dependency in slim image
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const h=require('http');h.get('http://localhost:3000/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/server.js"]
```

**Key decisions:**
- `node:22-bookworm-slim` not Alpine — musl libc breaks `better-sqlite3`
- `--no-install-recommends` cuts image size significantly
- System Chromium path: `/usr/bin/chromium` (Debian Bookworm default)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` prevents puppeteer from downloading its own bundled Chrome during `npm ci`
- Non-root user per CNTR-05; `--no-sandbox` still required in Chromium args even as non-root inside containers (kernel namespace limitation)

### Pattern 2: Docker Compose App + Postgres Orchestration

**What:** Full `docker-compose.yml` at project root extending the postgres service already defined in `docker/docker-compose.yml`. App service depends on postgres via `condition: service_healthy`.

**Example:**
```yaml
services:
  postgres:
    image: postgres:16-bookworm
    environment:
      POSTGRES_DB: rssservice
      POSTGRES_USER: rssuser
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rsspassword}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-scripts:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rssuser -d rssservice"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    restart: unless-stopped

  app:
    build: .
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://rssuser:${POSTGRES_PASSWORD:-rsspassword}@postgres:5432/rssservice
      PORT: "3000"
      BASE_URL: ${BASE_URL:-http://localhost:3000}
    env_file:
      - path: .env.docker
        required: false
    depends_on:
      postgres:
        condition: service_healthy
    shm_size: '256mb'
    restart: unless-stopped

volumes:
  postgres_data:
```

**Key decisions:**
- `shm_size: 256mb` for HLTH-04 — prevents Chromium `/dev/shm` OOM
- `restart: unless-stopped` (not `always`) — `docker stop` stays stopped, crashes auto-restart
- Named volume `postgres_data` (not bind mount) — avoids Linux UID permission issues
- `env_file: required: false` — gracefully handles missing `.env.docker` file
- `postgres` service hostname matches `DATABASE_URL` host segment — containers in same Compose project share DNS

### Pattern 3: `/health` Endpoint with DB Check

**What:** Add to Express app. Checks DB connectivity synchronously (short timeout). Returns 200 on success, 503 on failure. Used by Dockerfile HEALTHCHECK and Compose `condition: service_healthy`.

**Where to add:** `src/server.ts` or `src/app.ts`. Given the health check needs access to the server startup context, placing it in `src/app.ts` alongside the other routes is cleanest.

**Example:**
```typescript
// In src/app.ts — add before router mount

app.get('/health', async (_req, res) => {
  const uptime = process.uptime();

  if (isPgMode()) {
    try {
      await PgAdapter.getInstance().getPool().query('SELECT 1');
      res.status(200).json({ status: 'ok', db: 'connected', uptime });
    } catch (err) {
      res.status(503).json({ status: 'error', db: 'unreachable', uptime });
    }
  } else {
    // Supabase path — connectivity was already validated at startup
    res.status(200).json({ status: 'ok', db: 'supabase', uptime });
  }
});
```

**Important:** Mount `/health` BEFORE the main router in `app.ts` so it responds even if other routes have issues.

### Pattern 4: SIGTERM Graceful Shutdown

**What:** Listen for `SIGTERM` (Docker stop signal) and `SIGINT` (Ctrl+C). Sequence: stop cron scheduler → close HTTP server (drains in-flight requests) → close DB pool → exit. Include a timeout failsafe.

**Where:** `src/server.ts` — this is where `server.listen()` is called and where the cron task reference lives.

**Example:**
```typescript
// src/server.ts

import { createServer } from 'http';
import { PgAdapter } from './db/pg-adapter.js';
import { isPgMode } from './db/index.js';
import type { ScheduledTask } from 'node-cron';

let cronTask: ScheduledTask | null = null;

const server = createServer(app);

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  // 1. Stop accepting new cron runs
  if (cronTask) {
    await cronTask.stop();
    logger.info('Cron scheduler stopped');
  }

  // 2. Stop accepting new HTTP requests; wait for in-flight to complete
  server.close(async () => {
    logger.info('HTTP server closed');

    // 3. Close DB pool
    if (isPgMode()) {
      await PgAdapter.getInstance().shutdown();
      logger.info('DB pool closed');
    }

    process.exit(0);
  });

  // 4. Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### Pattern 5: In-Process Cron Scheduler

**What:** Extract the feed refresh logic from `POST /api/feeds/:id/refresh` into a shared `refreshFeed(feedId: string)` function in `src/services/scheduler.ts`. node-cron calls a wrapper that queries for due feeds and calls `refreshFeed()` per feed.

**Why extract:** The 200-line refresh logic in `feeds.ts` mixes HTTP response concerns with business logic. The scheduler needs the business logic without the HTTP layer.

**Cron schedule:** Every minute (`* * * * *`). The scheduler checks `next_refresh_at <= now()` in the DB to find feeds actually due — the timer granularity is just the polling interval, not the actual refresh cadence.

**Example:**
```typescript
// src/services/scheduler.ts

import { supabase } from '../db/index.js';
import pino from 'pino';
import type { FeedRow } from '../types/feed.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Query feeds due for refresh and refresh each one.
 * Called by node-cron every minute.
 */
export async function processDueFeeds(): Promise<void> {
  const now = new Date().toISOString();

  const { data: dueFeeds, error } = await supabase
    .from('feeds')
    .select('id, name, url, feed_type, selectors, platform_config, item_limit, refresh_interval_minutes')
    .lte('next_refresh_at', now)
    .eq('refresh_status', 'idle')
    .limit(10);  // cap concurrent refreshes

  if (error || !dueFeeds || dueFeeds.length === 0) return;

  logger.info({ count: dueFeeds.length }, 'Scheduler: refreshing due feeds');

  // Mark as refreshing to prevent concurrent runs
  await supabase
    .from('feeds')
    .update({ refresh_status: 'refreshing' })
    .in('id', dueFeeds.map((f: FeedRow) => f.id));

  // Refresh each feed (sequential to avoid browser overload)
  for (const feed of dueFeeds) {
    try {
      await refreshSingleFeed(feed as FeedRow);
    } catch (err) {
      logger.error({ feedId: feed.id, err }, 'Scheduler: feed refresh failed');
      await supabase
        .from('feeds')
        .update({ refresh_status: 'idle', last_refresh_error: String(err) })
        .eq('id', feed.id);
    }
  }
}
```

**Wire in server.ts:**
```typescript
import cron from 'node-cron';
import { processDueFeeds } from './services/scheduler.js';

// Only start cron in Docker/standalone mode — Vercel handles scheduling externally
if (!process.env.VERCEL) {
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await processDueFeeds();
    } catch (err) {
      logger.error({ err }, 'Cron scheduler error');
    }
  }, { noOverlap: true });  // skip run if previous is still executing

  logger.info('In-process cron scheduler started');
}
```

**`noOverlap: true`:** Critical option — prevents a slow feed refresh from stacking on itself if it runs longer than 1 minute.

### Pattern 6: Docker Chromium Path Update

**What:** Update `page-fetcher-browser.ts` `getBrowser()` to add a third branch for Docker, detected via `PUPPETEER_EXECUTABLE_PATH` env var.

**Example:**
```typescript
async function getBrowser(): Promise<Browser> {
  if (browserInstance?.connected) return browserInstance;

  if (process.env.VERCEL) {
    // Serverless: @sparticuz/chromium (unchanged)
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');
    chromium.default.setGraphicsMode = false;
    browserInstance = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: 'shell',
    });

  } else if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    // Docker: system Chromium (Debian Bookworm apt)
    // Note: --no-sandbox required even as non-root in Docker (kernel namespace constraint)
    const puppeteer = await import('puppeteer-core');
    browserInstance = await puppeteer.default.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: 'shell',
    });

  } else {
    // Local dev: bundled puppeteer
    const puppeteer = await import('puppeteer');
    browserInstance = await puppeteer.default.launch({ headless: 'shell' });
  }

  return browserInstance;
}
```

**Why `--disable-dev-shm-usage` in Docker:** Even with `shm_size: 256mb` in Compose, the `--disable-dev-shm-usage` flag provides a safety net by falling back to `/tmp`. Belt-and-suspenders approach.

### Anti-Patterns to Avoid

- **Bind-mounting source into Docker build:** The `.dockerignore` must exclude `node_modules`, `.env*`, and `dist` — without it, the host's `node_modules` shadows the container's, breaking native modules compiled for a different OS.
- **`restart: always` on app service:** `docker stop` will immediately restart the container. Use `unless-stopped` so manual stops stay stopped.
- **Alpine base image:** musl libc breaks `better-sqlite3` native bindings. Decided in prior research: must use `bookworm-slim`.
- **Exposing port 5432 to host in production compose:** PostgreSQL should be internal to the Docker network. Remove the `ports:` from the postgres service in the production compose.
- **Running migrations inside the health check:** The health endpoint must be fast (< 10s timeout). Migration logic belongs in `initializeDatabase()` at startup only.
- **Registering SIGTERM inside an async function:** `process.on('SIGTERM', ...)` must be registered synchronously at module level, not inside `startServer()` — otherwise it may not be registered before a signal arrives during slow startup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom `setInterval` loop | `node-cron` | `setInterval` has drift, no timezone support, no overlap prevention |
| Overlap prevention | Manual `isRunning` flag + lock | `node-cron` `noOverlap: true` option | Built-in, tested, handles async correctly |
| Health check HTTP call | `fetch()` or `axios` in HEALTHCHECK CMD | Inline Node.js `http.get()` | `fetch` requires import, `axios` adds dep; inline avoids both |
| DB pool shutdown | Manual connection draining | `PgAdapter.shutdown()` (already implemented) | Phase 7 already built `pool.end()` wrapper |
| Port selection | `get-port` dynamic selection | Fixed `PORT` env var (default 3000) | Docker needs predictable port for EXPOSE and healthcheck |

---

## Common Pitfalls

### Pitfall 1: Chromium Version Mismatch (RESOLVED)

**What goes wrong:** puppeteer-core expects a specific Chrome version; if system Chromium diverges, launches fail or produce garbage output.

**Why it happens:** Debian stable repos lag behind Chrome releases; puppeteer-core's expected revision may not match.

**Current status:** CONFIRMED SAFE — puppeteer-core 24.37.3 expects Chrome 145.0.7632.67. Debian Bookworm apt provides Chromium 145.0.7632.75 (same major.minor, same patch family). The slight build suffix difference is not a concern.

**How to verify during implementation:** Run `docker exec <app-container> chromium --version` and compare with `REVISION` in `node_modules/puppeteer-core/lib/esm/puppeteer/revisions.js`.

### Pitfall 2: Static Files Broken in Container

**What goes wrong:** `express.static('public')` resolves relative to `process.cwd()`. In Docker, `cwd` is `/app` which is correct, but the `public/` directory must be explicitly copied in the Dockerfile.

**Why it happens:** The multi-stage build only copies `dist/` by default — static assets are not TypeScript and don't end up in `dist/`.

**How to avoid:** Explicitly `COPY public ./public` in the production stage. Also copy `src/views/` if using any server-side template rendering that reads from the filesystem at runtime.

**Warning signs:** CSS/JS 404s in browser dev tools after `docker-compose up`.

### Pitfall 3: Port Race Condition in server.ts

**What goes wrong:** Current `server.ts` uses `get-port` to find an available port dynamically. In Docker, the HEALTHCHECK and EXPOSE directives are hardcoded to port 3000. If `get-port` picks a different port, healthchecks fail.

**Why it happens:** `get-port` was appropriate for local dev where multiple instances might run on the same host. In Docker, one container = one port.

**How to avoid:** Change `server.ts` to use `process.env.PORT || 3000` directly, removing the `get-port` dynamic selection. The `get-port` package remains in `package.json` (don't remove it — Vercel path may still use it).

**Implementation:** Replace:
```typescript
const port = await getPort({ port: portNumbers(3000, 3100) });
```
With:
```typescript
const port = parseInt(process.env.PORT || '3000', 10);
```

### Pitfall 4: SIGTERM Not Registered Before Async Startup

**What goes wrong:** SIGTERM is received during database initialization (which takes up to 30s with retries) and the handler isn't registered yet. The process exits ungracefully with no cleanup.

**Why it happens:** `process.on('SIGTERM', ...)` is registered inside the `startServer()` async function, after `await initializeDatabase()`. If a signal arrives during that 30s window, it's unhandled.

**How to avoid:** Register SIGTERM handler synchronously at the top of `server.ts`, before any async work:
```typescript
// Register BEFORE any async operations
const server = http.createServer(app);
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// THEN start async initialization
startServer();
```

### Pitfall 5: Scheduler Calling HTTP Endpoint vs Direct Function

**What goes wrong:** Building the scheduler to call `POST /api/feeds/:id/refresh` via HTTP internally — this adds HTTP overhead, requires the server to be up before the scheduler can run, and bypasses any future rate limiting.

**Why it happens:** The refresh logic lives in a route handler, making it tempting to reuse via HTTP.

**How to avoid:** Extract refresh business logic into `src/services/scheduler.ts` as pure functions. The route handler calls these functions. The cron scheduler also calls these functions directly. No HTTP round-trip.

### Pitfall 6: node-cron ESM Import in `"type": "module"` Project

**What goes wrong:** `import cron from 'node-cron'` fails with "does not provide an export named 'default'" because node-cron 4.x uses a named export structure.

**Why it happens:** node-cron 4.x exports changed between v3 and v4. TypeScript types may indicate default export but runtime behavior differs.

**How to avoid:** Use:
```typescript
import cron from 'node-cron';
// Or if default import fails:
import { schedule } from 'node-cron';
```
Test the import at integration time. The Context7 docs show `import cron from 'node-cron'` as working for ESM.

### Pitfall 7: Docker Compose postgres Port Exposure in Production

**What goes wrong:** The Phase 7 `docker/docker-compose.yml` exposes `"5432:5432"` to the host for development convenience. The production compose file should NOT expose the postgres port — only the app port should be host-accessible.

**Why it happens:** Development configs get copy-pasted into production.

**How to avoid:** In the production `docker-compose.yml`, omit `ports:` from the `postgres` service entirely. Containers in the same Compose project communicate via the internal Docker network using the service name as hostname.

---

## Code Examples

### `.dockerignore`
```
# Dependencies (rebuilt inside container)
node_modules/

# Build output (produced inside builder stage)
dist/

# Environment files (injected via docker-compose env_file or -e flags)
.env
.env.*
!.env.docker.example

# Source control
.git/
.gitignore

# Development tools
*.log
.DS_Store

# Planning docs (not needed in image)
.planning/

# Data files (database is in postgres container, not app container)
data/
```

### `.env.docker.example`
```bash
# ── PostgreSQL ────────────────────────────────────────────────────────────────
# Connection string for the bundled PostgreSQL container.
# In Docker Compose, the hostname is the service name ("postgres").
DATABASE_URL=postgresql://rssuser:CHANGE_ME@postgres:5432/rssservice
POSTGRES_PASSWORD=CHANGE_ME

# ── Application ───────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=3000

# The public URL of your deployment (used for feed XML self-references).
# Change to your domain if behind a reverse proxy.
BASE_URL=http://localhost:3000

# ── Chromium (set automatically in Dockerfile — override if needed) ────────────
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ── Optional API Keys ─────────────────────────────────────────────────────────
# YouTube Data API v3 key — required only for YouTube feed type.
# Stored in the database settings table, not required here.
# YOUTUBE_API_KEY=

# Cron endpoint secret — required if exposing /api/cron/scheduler via HTTP.
# Not needed for in-process scheduler (Docker default).
# CRON_SECRET=
```

### Health endpoint (HLTH-01)
```typescript
// Add to src/app.ts before router mount
import { isPgMode } from './db/index.js';
import { PgAdapter } from './db/pg-adapter.js';

app.get('/health', async (_req, res) => {
  const uptime = process.uptime();

  if (isPgMode()) {
    try {
      // Quick connectivity check — must complete within Dockerfile HEALTHCHECK timeout
      await PgAdapter.getInstance().getPool().query('SELECT 1');
      res.status(200).json({ status: 'ok', db: 'connected', uptime });
    } catch {
      // Return 503 so Docker marks container unhealthy
      res.status(503).json({ status: 'error', db: 'unreachable', uptime });
    }
  } else {
    // Supabase path — no direct pool to check; assume ok if app is running
    res.status(200).json({ status: 'ok', db: 'supabase', uptime });
  }
});
```

### node-cron with `noOverlap` and SIGTERM integration
```typescript
// src/server.ts (key excerpts)
import cron, { type ScheduledTask } from 'node-cron';
import { processDueFeeds } from './services/scheduler.js';
import http from 'http';
import { PgAdapter } from './db/pg-adapter.js';
import { isPgMode } from './db/index.js';

const server = http.createServer(app);
let cronTask: ScheduledTask | null = null;

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown initiated');

  if (cronTask) {
    await cronTask.stop();
    logger.info('Cron stopped');
  }

  server.close(async () => {
    if (isPgMode()) {
      await PgAdapter.getInstance().shutdown();
    }
    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 10s if requests don't drain
  setTimeout(() => {
    logger.error('Forced exit after 10s timeout');
    process.exit(1);
  }, 10_000).unref();  // .unref() allows event loop to exit normally before timeout
}

// Register BEFORE async work
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function startServer(): Promise<void> {
  await initializeDatabase();

  const port = parseInt(process.env.PORT || '3000', 10);

  server.listen(port, () => {
    logger.info({ port }, 'RSS Service running');

    if (!process.env.VERCEL) {
      cronTask = cron.schedule('* * * * *', async () => {
        try {
          await processDueFeeds();
        } catch (err) {
          logger.error({ err }, 'Cron error');
        }
      }, { noOverlap: true });

      logger.info('Cron scheduler started');
    }
  });
}

startServer();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel cron (HTTP endpoint, daily on Hobby) | In-process `node-cron` (per-feed interval, minutely polling) | Phase 8 | Feeds now refresh on configured schedule; sub-hour intervals become possible |
| `@sparticuz/chromium` (Lambda binary) | System Chromium via `apt-get install chromium` | Phase 8 | Simpler Dockerfile, no binary decompression, uses OS-managed Chromium security updates |
| `get-port` dynamic port selection | Fixed `PORT` env var (default 3000) | Phase 8 | Required for Docker EXPOSE + HEALTHCHECK compatibility |
| Supabase-only DB | `DATABASE_URL` → pg Pool + Supabase fallback | Phase 7 (complete) | DB abstraction already done; Phase 8 only adds health check and shutdown integration |

**Deprecated/outdated in this context:**
- `@sparticuz/chromium` in Docker: its own README explicitly deprecates this use case
- `depends_on` without `condition: service_healthy`: causes startup race conditions; always use healthcheck-gated dependency
- `restart: always`: overrides `docker stop`; use `unless-stopped`

---

## Open Questions

1. **Should `docker-compose.yml` live at project root or in `docker/`?**
   - What we know: Phase 7 created `docker/docker-compose.yml` for postgres only; Phase 8 requirement says "a single `docker-compose up --build` from a fresh clone"
   - What's unclear: Whether to move/supersede `docker/docker-compose.yml` or create a separate root-level file
   - Recommendation: Create `docker-compose.yml` at project root (the standard location users expect); keep `docker/docker-compose.yml` as the postgres-only dev reference. The root file includes the postgres service definition inline (duplicating it) or via `include:` (Docker Compose 2.20+ feature). Safest: inline duplication to avoid `include:` version dependency.

2. **Should `src/views/` be copied into the Docker image?**
   - What we know: `src/views/` contains EJS/Handlebars templates; `src/templates.ts` may read them from disk at runtime
   - What's unclear: Whether templates are embedded at compile time or read from filesystem at runtime
   - Recommendation: Check `src/templates.ts` — if it uses `fs.readFile` or `__dirname` paths, copy `src/views/` in Dockerfile. If templates are imported/inlined during build, they end up in `dist/` automatically.

3. **Should the scheduler extract ALL feed refresh logic or call the route handler via internal HTTP?**
   - What we know: The `POST /api/feeds/:id/refresh` handler is ~200 lines mixing HTTP and business logic; extracting it is the right architecture but adds work
   - What's unclear: Whether the Phase 8 scope allows for this refactor or if a simpler approach (internal HTTP call) is acceptable
   - Recommendation: Extract to `src/services/scheduler.ts`. The planner should include this as a distinct task in Plan 08-02. Internal HTTP is a shortcut that couples the scheduler to the HTTP layer and breaks if the server is slow to start.

4. **Puppeteer `headless: 'shell'` vs `headless: true` in Docker**
   - What we know: The current `page-fetcher-browser.ts` uses `headless: 'shell'` for all paths; `shell` mode uses the `chrome-headless-shell` binary which is a stripped-down version
   - What's unclear: Whether the system Chromium package installs `chrome-headless-shell` as a separate binary or whether `headless: 'shell'` works with the standard `chromium` package
   - Recommendation: Default to `headless: true` (new headless mode, uses full Chromium binary) in Docker since we're using system Chromium, not a separately downloaded binary. This needs to be verified during implementation.

---

## Sources

### Primary (HIGH confidence)
- [Debian Bookworm chromium package](https://packages.debian.org/bookworm/chromium) — confirmed version 145.0.7632.75-1~deb12u1 in apt
- `node_modules/puppeteer-core/lib/esm/puppeteer/revisions.js` — confirmed expected Chrome 145.0.7632.67
- `src/db/pg-adapter.ts:478` — `PgAdapter.shutdown()` already implemented with `pool.end()`
- [node-cron Context7 docs](/websites/nodecron) — `task.stop()`, `noOverlap: true`, ESM import, TypeScript interface
- [Express graceful shutdown](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html) — official SIGTERM + `server.close()` pattern
- [Puppeteer Docker guide](https://pptr.dev/guides/docker) — `--init` flag, `SYS_ADMIN` cap, system Chromium approach
- [Puppeteer official Dockerfile](https://github.com/puppeteer/puppeteer/blob/main/docker/Dockerfile) — `node:24-bookworm` base, font packages, pptruser non-root pattern
- Direct codebase analysis — `src/server.ts`, `src/app.ts`, `src/services/page-fetcher-browser.ts`, `docker/docker-compose.yml`, `package.json`

### Secondary (MEDIUM confidence)
- [Puppeteer troubleshooting](https://pptr.dev/troubleshooting) — required apt packages list for Chromium
- [@sparticuz/chromium README](https://github.com/Sparticuz/chromium) — explicitly recommends distro packages for Docker
- [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/) — `condition: service_healthy` pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against npm registry, Debian package tracker, puppeteer-core source, Context7
- Architecture: HIGH — patterns are well-established; Chromium version compatibility confirmed; shutdown sequence verified against Express docs
- Pitfalls: HIGH — all pitfalls from prior research validated; new pitfalls (port, SIGTERM timing, static files) confirmed from codebase analysis
- Open questions: MEDIUM — Recommendation given for each but requires implementation validation

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable Docker/Node.js ecosystem; Debian Bookworm apt package versions may update)
