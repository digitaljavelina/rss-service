# Phase 08 Plan 02 Summary: Runtime Wiring

## What Was Built

Wired the Express app and server for Docker runtime:

1. **Health Endpoint** (`src/app.ts`):
   - `GET /health` returns JSON: `{ status, db, uptime }`
   - Checks `isPgMode()` to determine DB backend
   - pg mode: queries `SELECT 1`, returns 200/503 based on connectivity
   - Supabase mode: returns 200 with `db: 'supabase'`
   - Placed BEFORE `app.use(router)` so it's always reachable

2. **SIGTERM Graceful Shutdown** (`src/server.ts`):
   - Uses `http.createServer(app)` for shutdown control
   - Signal handlers registered SYNCHRONOUSLY at module level
   - Shutdown sequence: stop cron → close HTTP server → close DB pool → exit 0
   - 10-second forced exit timeout if graceful shutdown stalls
   - `cronTask` variable placeholder for Phase 9 (null-checked in shutdown)

3. **Fixed Port Selection** (`src/server.ts`):
   - Removed `get-port` dynamic port selection
   - Uses `parseInt(process.env.PORT || '3000', 10)` for container compatibility
   - `get-port` left in package.json (Vercel dev may still use it)

4. **Docker Chromium Path** (`src/services/page-fetcher-browser.ts`):
   - Three-way browser detection:
     1. Vercel: `@sparticuz/chromium` (unchanged)
     2. Docker: `PUPPETEER_EXECUTABLE_PATH` → system Chromium with `--no-sandbox`
     3. Local dev: full `puppeteer` with bundled Chrome (unchanged)
   - Docker uses `headless: true` (not `'shell'`) — system Chromium lacks chrome-headless-shell

## Key Decisions

- Signal handlers at module level (not inside async startServer) per Node.js best practice
- 10s shutdown timeout prevents container hanging on stuck connections
- `--no-sandbox` required in Docker even as non-root (kernel namespace constraint)
- `--disable-dev-shm-usage` as safety net alongside compose `shm_size: 256mb`

## Files Modified

- `src/app.ts` — added /health endpoint
- `src/server.ts` — rewrote for http.createServer, SIGTERM handler, fixed port
- `src/services/page-fetcher-browser.ts` — added Docker Chromium branch

## Verification

- `npx tsc --noEmit` passes with no errors
- Health endpoint, SIGTERM handler, and Chromium path all wired
- Phase 9 cronTask placeholder ready (no node-cron installed yet)
