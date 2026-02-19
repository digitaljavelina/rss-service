# Phase 09 Plan 01 Summary: In-Process Cron Scheduling

## What Was Built

Created an in-process cron scheduler for Docker deployments:

1. **Scheduler Service** (`src/services/scheduler.ts`):
   - `startScheduler()` — starts node-cron task, returns handle for shutdown (or null in Supabase mode)
   - `refreshDueFeeds()` — shared logic for querying and refreshing due feeds (used by both Docker cron and Vercel handler)
   - `extractItems(feed)` — platform-aware extraction (web, youtube, reddit)
   - `refreshFeed(feed)` — single feed refresh with dedup, item insertion, limit enforcement
   - Cron expression: `* * * * *` (every minute, checks if any feeds are due)
   - Max 10 feeds per tick to prevent long-running cycles

2. **Server Wiring** (`src/server.ts`):
   - Imports `startScheduler` from scheduler service
   - Calls `startScheduler()` after server starts listening
   - `cronTask` variable receives the cron handle (or null)
   - Shutdown handler already calls `cronTask.stop()` (wired in Phase 8)

3. **Dependencies**:
   - Installed `node-cron@3.0.3` (bundled TypeScript types, no @types needed)

## Key Decisions

- **Scheduler starts only in pg mode**: `isPgMode()` check prevents cron from running in Supabase/Vercel mode where Vercel cron handles scheduling externally
- **Shared refresh logic**: `refreshDueFeeds()` is exported so the Vercel cron handler can potentially import it (reduces code duplication)
- **Every-minute cron**: The scheduler runs every minute but only processes feeds where `next_refresh_at <= now` — this allows feed-specific intervals (15m, 1h, daily) without changing the cron expression
- **Uses unified supabase proxy**: Works transparently with both pg Pool and Supabase backends via `src/db/index.ts`

## Files Created/Modified

- `src/services/scheduler.ts` (new)
- `src/server.ts` (modified — import + startScheduler call)
- `package.json` (added node-cron dependency)

## Verification

- `npx tsc --noEmit` passes with no errors
- Scheduler only starts in pg mode (confirmed by `isPgMode()` check in `startScheduler()`)
- Shutdown handler already wired to stop cron task (Phase 8)

## How It Works

1. Server starts → database initialized → server.listen()
2. After listen callback, `startScheduler()` is called
3. If `DATABASE_URL` is set (pg mode), node-cron schedules `refreshDueFeeds()` every minute
4. Each tick queries feeds where `next_refresh_at <= now` and `refresh_status = 'idle'`
5. Feeds are marked 'refreshing', processed in parallel, then updated with new `next_refresh_at`
6. On SIGTERM, `cronTask.stop()` is called before closing HTTP server and DB pool
