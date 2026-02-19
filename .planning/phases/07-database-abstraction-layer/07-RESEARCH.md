# Phase 7: Database Abstraction Layer - Research

**Researched:** 2026-02-18
**Domain:** Node.js database abstraction — pg Pool + Supabase JS dual-backend, Docker PostgreSQL init, startup migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Abstraction depth
- Unsupported query patterns should degrade gracefully: log a warning and return empty/null rather than crashing the app
- Both Supabase and local PG paths should be equally easy to develop against — no preferred default

#### Schema management
- Auto-migrate on startup: detect outdated schema and apply pending migrations automatically, no manual intervention required
- App should check schema version and apply any missing migrations before serving requests

#### Dev workflow
- Both backends equally supported — neither is "primary" or "secondary"
- Backend confirmation (which DB connected) logged at debug level only, not shown by default in normal startup output

#### Error & fallback behavior
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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | App uses pg Pool when DATABASE_URL is set, Supabase JS client otherwise — existing routes unchanged | `src/db/index.ts` Proxy pattern already in place; new index exports a unified `supabase` Proxy that dispatches to pg or Supabase client based on `DATABASE_URL` presence |
| DB-02 | PostgreSQL schema initializes automatically on first docker-compose up via init-scripts | Docker official postgres image runs all `.sql` files in `/docker-entrypoint-initdb.d/` on first volume init; `src/db/schema.ts` refactors to detect version and apply migrations programmatically before server accepts requests |
</phase_requirements>

---

## Summary

The codebase already has the right skeleton in `src/db/index.ts`: a lazy-initialized Supabase client exposed via a `Proxy` object under the exported name `supabase`. The entire route layer calls `supabase.from(table).select/insert/update/delete/...` — the classic PostgREST chainable API. The goal is to make that Proxy silently dispatch to either the Supabase JS client or a home-built pg adapter depending on `DATABASE_URL`.

A full codebase audit reveals the query surface is **narrow and well-defined** (see "Codebase Query Audit" below). There are only ~8 distinct operation shapes used across all routes and services: `select`, `select+single`, `select+count+head`, `insert`, `insert-array`, `upsert`, `update`, `delete`, `delete+in`. Every operation is used with positional filters (`eq`, `or`, `in`, `lt`, `order`, `limit`). This makes a purpose-built, thin pg adapter tractable — there is no need for a general-purpose ORM or query-builder.

The recommended approach is: create a **neutral pg adapter** that exposes exactly the chainable `.from().select()` shape, backed by plain parameterized SQL via `pg` Pool, and make `src/db/index.ts` export the right implementation. Schema initialization uses **raw SQL files** executed programmatically by the pg adapter at startup (via `node-pg-migrate` runner or direct `pool.query`), with the same SQL also serving as the Docker `docker-entrypoint-initdb.d/` init script.

**Primary recommendation:** Build a thin pg adapter that exactly mirrors the Supabase JS chainable API for the ~8 operation shapes actually used. Keep `supabase` as the export name. Wire `src/db/index.ts` to dispatch on `DATABASE_URL`. Auto-migrate via raw SQL files at startup.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pg` | 8.18.0 (current) | pg Pool — the Node.js PostgreSQL client; pool.query for all DB ops | Industry standard; ships `@types/pg` separately; Pool handles auto-reconnect |
| `@types/pg` | 8.16.0 (current) | TypeScript types for `pg` | Required for type-safe query results |
| `@supabase/supabase-js` | ^2.95.3 (already installed) | Supabase path — existing client, no change needed | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node-pg-migrate` | 8.0.4 (current) | Programmatic migration runner | Used in startup code to apply pending SQL migration files before the server begins accepting requests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node-pg-migrate` | Raw `pool.query` with version table | Simpler but requires hand-rolling ordering, idempotency tracking, locking; node-pg-migrate handles all that |
| `node-pg-migrate` | `postgres-migrations` npm | Less maintained, node-pg-migrate has more stars and active development |
| `pg` Pool | `postgres` (porsager) | Better DX but different API, adds unnecessary complexity to the abstraction |
| Thin pg adapter | Full ORM (Prisma, TypeORM) | Far more complexity than needed; the query surface is too small to justify ORM overhead |

**Installation:**
```bash
npm install pg @types/pg node-pg-migrate
```

---

## Codebase Query Audit

**This is the complete set of Supabase API patterns found across all files in `src/`. The pg adapter must implement exactly these — no more.**

### Files using `supabase`:
- `src/db/index.ts` — client init and Proxy export
- `src/db/schema.ts` — `supabase.from('feeds').select('id').limit(1)` (connection check)
- `src/routes/api/feeds.ts` — full CRUD (see below)
- `src/routes/api/settings.ts` — select, select+single, upsert, delete
- `src/services/feed-builder.ts` — select+single, select+limit+order
- `src/services/youtube.ts` — select+single (get settings key)

### Complete operation inventory:

| Operation shape | Example call | SQL equivalent |
|----------------|--------------|----------------|
| `select(cols).eq(k,v).single()` | `.from('feeds').select('slug').eq('slug', slug).single()` | `SELECT slug FROM feeds WHERE slug=$1 LIMIT 1` |
| `select('*').or(expr).single()` | `.from('feeds').select('*').or('id.eq.X,slug.eq.Y').single()` | `SELECT * FROM feeds WHERE id=$1 OR slug=$2 LIMIT 1` |
| `select(cols).order(col,asc).limit(n)` | `.from('items').select('*').eq('feed_id',id).order('pub_date',{ascending:false}).limit(100)` | `SELECT * FROM items WHERE feed_id=$1 ORDER BY pub_date DESC LIMIT $2` |
| `select('*',{count:'exact',head:true}).eq(k,v)` | `.from('items').select('*',{count:'exact',head:true}).eq('feed_id',id)` | `SELECT COUNT(*) FROM items WHERE feed_id=$1` |
| `select(cols).eq(k,v).order(col).limit(n)` | `.from('items').select('id').eq('feed_id',id).order('pub_date',{ascending:true}).limit(n)` | `SELECT id FROM items WHERE feed_id=$1 ORDER BY pub_date ASC LIMIT $2` |
| `select(cols).order(col,{ascending:false})` | `.from('feeds').select('id,slug,...').order('created_at',{ascending:false})` | `SELECT id,slug,... FROM feeds ORDER BY created_at DESC` |
| `select(col).eq(k,v)` | `.from('items').select('guid').eq('feed_id',id)` | `SELECT guid FROM items WHERE feed_id=$1` |
| `insert(obj)` | `.from('feeds').insert({id,...})` | `INSERT INTO feeds (...) VALUES (...)` |
| `insert(array)` | `.from('items').insert([...])` | `INSERT INTO items (...) VALUES (...),(...),...` |
| `upsert(obj,{onConflict:col})` | `.from('settings').upsert({key,value,...},{onConflict:'key'})` | `INSERT INTO settings (...) VALUES (...) ON CONFLICT (key) DO UPDATE SET ...` |
| `update(obj).eq(k,v)` | `.from('feeds').update({updated_at:...}).eq('id',id)` | `UPDATE feeds SET updated_at=$1 WHERE id=$2` |
| `update(obj).eq(k,v).select().single()` | `.from('feeds').update({...}).eq('id',id).select().single()` | `UPDATE feeds SET ... WHERE id=$1 RETURNING *` |
| `delete().eq(k,v)` | `.from('items').delete().eq('feed_id',id)` | `DELETE FROM items WHERE feed_id=$1` |
| `delete().in(col,arr)` | `.from('items').delete().in('id',[...])` | `DELETE FROM items WHERE id = ANY($1)` |

**Total distinct shapes: 14.** The pg adapter needs to support exactly these.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   ├── index.ts          # Export supabase Proxy — dispatches to pg or Supabase client
│   ├── pg-adapter.ts     # Thin pg Pool adapter — implements chainable .from() API
│   ├── schema.ts         # Startup: initializeDatabase() — retries, version check, migrations
│   └── migrations/
│       ├── 001_initial_schema.sql   # Full schema from supabase-schema.sql
│       └── 002_...sql               # Future migrations
├── routes/               # Zero changes
├── services/             # Zero changes
```

```
docker/
├── docker-compose.yml    # postgres service + app service
└── init-scripts/
    └── 001_initial_schema.sql    # Symlink or copy of db/migrations/001
```

### Pattern 1: Environment-Dispatched Proxy (existing, to be upgraded)

**What:** `src/db/index.ts` exports `supabase` — a Proxy that at call time looks at `DATABASE_URL` and routes to either the Supabase JS client or the pg adapter.

**When to use:** Always. This is the single export that all routes import unchanged.

**Current state:**
```typescript
// src/db/index.ts — current implementation
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  }
});
```

**Target state:**
```typescript
// src/db/index.ts — after Phase 7
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PgAdapter } from './pg-adapter.js';

function getClient(): SupabaseClient | PgAdapter {
  if (process.env.DATABASE_URL) {
    return PgAdapter.getInstance();  // pg Pool path
  }
  return getSupabase();              // Supabase JS client path
}

// Same export name — zero route changes
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  }
});
```

### Pattern 2: Chainable pg Adapter

**What:** A class with a `.from(table)` method returning a query builder that accumulates filters and materializes to SQL on `.single()`, `.limit()`, `.eq()`, etc.

**When to use:** The pg adapter is internal only — nothing outside `src/db/` touches it directly.

```typescript
// src/db/pg-adapter.ts — illustrative structure
import { Pool, PoolConfig } from 'pg';

interface QueryResult<T = Record<string, unknown>> {
  data: T | T[] | null;
  error: DbError | null;
  count?: number | null;
}

interface DbError {
  code: string;           // 'query_failed' | 'database_unavailable' | 'not_found'
  message: string;        // human-readable, never raw SQL
}

class QueryBuilder<T = Record<string, unknown>> {
  private table: string;
  private pool: Pool;
  private _select: string = '*';
  private _filters: string[] = [];
  private _values: unknown[] = [];
  private _order: string | null = null;
  private _limit: number | null = null;
  private _countOnly: boolean = false;
  private _returnData: boolean = false;

  // ... chainable methods: select(), eq(), or(), in(), order(), limit(), single()
  // ... terminal methods: insert(), update(), delete(), upsert()

  async single(): Promise<QueryResult<T>> { /* SELECT ... LIMIT 1 */ }
  async execute(): Promise<QueryResult<T[]>> { /* SELECT ... */ }
}

export class PgAdapter {
  private static instance: PgAdapter;
  private pool: Pool;

  static getInstance(): PgAdapter { /* singleton */ }

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table, this.pool);
  }
}
```

### Pattern 3: Startup Init with Exponential Backoff

**What:** `initializeDatabase()` in `src/db/schema.ts` retries the DB connection with exponential backoff before the server starts accepting requests.

**When to use:** Called from `src/server.ts` before `app.listen()`.

```typescript
// src/db/schema.ts — startup retry pattern (no library needed)
export async function initializeDatabase(): Promise<void> {
  const maxWaitMs = 30_000;
  const baseDelayMs = 500;
  let attempt = 0;
  let lastError: unknown;

  while (true) {
    const elapsed = attempt === 0 ? 0 : baseDelayMs * Math.pow(2, attempt - 1);
    if (elapsed > maxWaitMs) {
      throw new Error(`Database unreachable after ${maxWaitMs}ms: ${lastError}`);
    }

    try {
      await testConnection();     // pool.query('SELECT 1') or supabase ping
      await runMigrations();      // node-pg-migrate runner or no-op for Supabase
      return;                     // success
    } catch (err) {
      lastError = err;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxWaitMs);
      logger.debug({ attempt, delay }, 'DB not ready, retrying...');
      await sleep(delay);
      attempt++;
    }
  }
}
```

### Pattern 4: node-pg-migrate Programmatic Runner

**What:** After connecting, run migrations programmatically. This works in both directions: new volumes get all migrations, existing volumes get only pending ones.

```typescript
// Source: https://salsita.github.io/node-pg-migrate/api
import { runner } from 'node-pg-migrate';

async function runMigrations(databaseUrl: string): Promise<void> {
  await runner({
    databaseUrl,
    dir: new URL('./migrations', import.meta.url).pathname,
    direction: 'up',
    migrationsTable: 'pgmigrations',  // tracks applied migrations
    log: (msg) => logger.debug({ msg }, 'migration'),
  });
}
```

**Key insight:** `migrationsTable` tracks which SQL files have been applied. On first run all files apply. On subsequent runs only pending ones apply. This is the "detect outdated schema and apply pending migrations" requirement.

### Pattern 5: Docker PostgreSQL with Init Scripts

**What:** The official `postgres` Docker image runs all `.sql` files in `/docker-entrypoint-initdb.d/` on first container start (empty volume only). This satisfies DB-02.

**Critical constraint:** Init scripts run only once — on first volume init. They do not re-run on container restart if the volume already has data.

```yaml
# docker-compose.yml — full pattern
services:
  postgres:
    image: postgres:16-bookworm         # Debian-based, matches node:22-bookworm-slim
    environment:
      POSTGRES_DB: rssservice
      POSTGRES_USER: rssuser
      POSTGRES_PASSWORD: rsspassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-scripts:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://rssuser:rsspassword@postgres:5432/rssservice
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

**Source:** https://docs.docker.com/compose/how-tos/startup-order/

### Pattern 6: pg Pool CONNECTION_STRING Auto-Read

**What:** `pg.Pool` accepts `connectionString` directly. When `DATABASE_URL` is set, pass it as `connectionString`.

```typescript
// Source: https://node-postgres.com/features/connecting
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// Pool emits 'error' for idle client failures — must handle or process crashes
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle pg client');
});
```

### Pattern 7: Categorized Error Normalization

**What:** Wrap all DB operations in a normalizer that maps raw pg errors and Supabase errors to a consistent `DbError` shape before propagating to routes.

```typescript
// Error category mapping for pg errors
function normalizePgError(err: unknown): DbError {
  if (err instanceof Error) {
    const pgErr = err as NodeJS.ErrnoException & { code?: string };
    if (pgErr.code === 'ECONNREFUSED' || pgErr.code === 'ETIMEDOUT') {
      return { code: 'database_unavailable', message: 'Database is not reachable' };
    }
    if (pgErr.code === '23505') { // unique_violation
      return { code: 'conflict', message: 'A record with this identifier already exists' };
    }
    if (pgErr.code === '42P01') { // undefined_table
      return { code: 'schema_error', message: 'Required database table does not exist' };
    }
  }
  return { code: 'query_failed', message: 'Database operation failed' };
}

// Error category mapping for Supabase errors
function normalizeSupabaseError(err: { code?: string; message?: string }): DbError {
  if (err.code === 'PGRST116') { // not found
    return { code: 'not_found', message: 'Record not found' };
  }
  return { code: 'query_failed', message: 'Database operation failed' };
}
```

### Anti-Patterns to Avoid

- **Implementing the full PostgREST API:** Only implement the 14 operation shapes actually used. A general-purpose adapter would be premature and risky.
- **Logging DB backend at INFO level:** The decision says debug level only. Using `logger.info()` for "connected to PostgreSQL" violates the constraint.
- **Using `pool.connect()` for simple queries:** Use `pool.query()` directly for all non-transaction queries. `pool.connect()` is only needed for multi-statement transactions (none exist in current codebase).
- **Sharing the init SQL file between Docker and migration runner as a symlink:** Keep the Docker init script separate. The migration runner's `001_initial_schema.sql` and the Docker init script can be the same file but must be kept in sync manually — do not attempt a symlink inside Docker build context.
- **Using `PGPASSWORD`, `PGUSER` etc. env vars instead of `DATABASE_URL`:** The switching decision is keyed on `DATABASE_URL` presence. If you also accept individual pg env vars, the detection logic becomes ambiguous.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration tracking | Custom version table + order logic | `node-pg-migrate` runner | Handles file ordering, locking, rollback tracking, idempotency |
| Exponential backoff | Complex retry framework | Simple loop with `Math.pow(2, attempt) * baseMs` | For startup, 10 lines of code is sufficient; no library needed |
| pg connection pool | Manual client management | `pg.Pool` | Pool handles idle eviction, max connections, auto-reconnect |
| SQL injection prevention | String concatenation | Parameterized queries `pool.query('... $1', [val])` | Fundamental pg security, never deviate |

**Key insight:** The pg adapter is custom by necessity (it must mirror the Supabase chainable API for zero-route-change), but everything else should use libraries.

---

## Common Pitfalls

### Pitfall 1: pg Pool `ECONNREFUSED` Crashes Process If Unhandled
**What goes wrong:** `pool.on('error', ...)` must be registered. If an idle client in the pool loses its connection (e.g., PG restarts), pg emits an error event. If no handler is registered, Node.js throws an uncaught exception and the process crashes.
**Why it happens:** Node.js default behavior for unhandled EventEmitter errors.
**How to avoid:** Always register `pool.on('error', (err) => logger.error(err))` immediately after creating the pool.
**Warning signs:** Process exits during testing after DB container restart without any explicit error in application code.

### Pitfall 2: `.or()` Filter Syntax Differs Between Supabase and SQL
**What goes wrong:** Supabase uses `'id.eq.X,slug.eq.Y'` string syntax for OR filters. The pg adapter must parse this string format or accept an alternative internal representation.
**Why it happens:** Supabase's PostgREST API encodes filters as URL-style strings. pg speaks SQL.
**How to avoid:** In the pg adapter, accept the Supabase string format in `.or()` and translate it to `WHERE id = $1 OR slug = $2`. The query patterns are finite and known — parse the comma-separated `col.op.val` format.
**Warning signs:** `.or()` calls silently do nothing (returns all rows without filtering).

### Pitfall 3: `select('*', { count: 'exact', head: true })` Has No Direct pg Equivalent
**What goes wrong:** This Supabase idiom returns a `count` field with no rows. In pg you must run a `SELECT COUNT(*) FROM ... WHERE ...` query — the result is in `rows[0].count` as a string (not a number).
**Why it happens:** Supabase's PostgREST HTTP layer handles this as a Prefer: count=exact header. pg has no such concept.
**How to avoid:** The pg adapter detects `{ count: 'exact', head: true }` in `.select()` options and emits a `COUNT(*)` query instead. Return `{ data: null, count: parseInt(rows[0].count, 10) }`.
**Warning signs:** `count` is `null` or `undefined` for all count queries in pg mode; item-limit enforcement silently breaks.

### Pitfall 4: Docker Init Scripts Only Run on Empty Volume
**What goes wrong:** If a developer runs `docker-compose up` with an existing volume, the init scripts in `docker-entrypoint-initdb.d/` do not re-run. Schema changes made after initial setup are not applied automatically.
**Why it happens:** Official postgres Docker image design — init scripts are bootstrapping, not migration.
**How to avoid:** This is why startup migrations via `node-pg-migrate` are essential — they handle schema evolution. Docker init is only for first-time volume init. Developers who need to re-init from scratch must `docker-compose down -v` to delete the volume.
**Warning signs:** Developer runs `docker-compose up`, connects, and gets "column does not exist" errors after a schema update that only modified the init script.

### Pitfall 5: Supabase `.single()` Returns `{ data: null, error: {code: 'PGRST116'} }` For Not-Found; pg Throws
**What goes wrong:** In Supabase JS, a `SELECT ... LIMIT 1` that returns no rows gives `{ data: null, error: {...} }`. In pg, `pool.query()` returns `{ rows: [] }` with no error. Code that checks `if (error || !feed)` will work correctly for Supabase but may need to check `rows.length === 0` for pg.
**Why it happens:** Different error semantics between PostgREST and raw pg.
**How to avoid:** The pg adapter's `.single()` method must normalize: if `rows.length === 0`, return `{ data: null, error: { code: 'not_found', message: 'Record not found' } }`. Existing route code that checks `if (error || !feed)` then works unchanged on both paths.
**Warning signs:** Routes return 404 for all records in Supabase mode, or never return 404 in pg mode.

### Pitfall 6: node-pg-migrate Programmatic API Requires Closing Its DB Client
**What goes wrong:** When using `databaseUrl` option (not `dbClient`), node-pg-migrate creates its own pg Client for migration. This is separate from the Pool. If your Pool is already connected, they share the DB but are separate connections. No resource leak, but you cannot use the same Pool client.
**Why it happens:** node-pg-migrate manages its own lifecycle when given a connection string.
**How to avoid:** Use the `databaseUrl` option in the programmatic runner. Let it manage its own connection. The app's Pool is initialized separately after migrations complete.

### Pitfall 7: `INSERT ... ON CONFLICT` Syntax for Upsert Requires Explicit Column List
**What goes wrong:** Supabase `.upsert({...}, { onConflict: 'key' })` becomes `INSERT INTO settings (...) VALUES (...) ON CONFLICT (key) DO UPDATE SET ...`. The `DO UPDATE SET` clause must list every column being updated — you cannot say `DO UPDATE SET *`.
**Why it happens:** PostgreSQL syntax requirement.
**How to avoid:** In the pg adapter's `.upsert()` method, build the `DO UPDATE SET col=$N, ...` clause from the object's keys, excluding the conflict column.
**Warning signs:** Upsert silently does nothing or throws "syntax error near *".

---

## Code Examples

Verified patterns from official sources:

### pg Pool with DATABASE_URL
```typescript
// Source: https://node-postgres.com/features/connecting
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
});

// Simple query
const result = await pool.query<{ id: string }>('SELECT id FROM feeds WHERE slug = $1', [slug]);
const feed = result.rows[0] ?? null;
```

### pg Pool parameterized query patterns
```typescript
// Source: https://node-postgres.com/apis/client
// SELECT with multiple params
const result = await pool.query(
  'SELECT * FROM feeds WHERE id = $1 OR slug = $2 LIMIT 1',
  [id, slug]
);

// INSERT
await pool.query(
  'INSERT INTO feeds (id, slug, name, url) VALUES ($1, $2, $3, $4)',
  [feedId, slug, name, url]
);

// UPDATE with RETURNING
const result = await pool.query(
  'UPDATE feeds SET name = $1, updated_at = $2 WHERE id = $3 RETURNING *',
  [name, new Date().toISOString(), id]
);

// COUNT
const result = await pool.query(
  'SELECT COUNT(*)::int AS count FROM items WHERE feed_id = $1',
  [feedId]
);
const count: number = result.rows[0].count;

// DELETE with IN
await pool.query(
  'DELETE FROM items WHERE id = ANY($1)',
  [itemIds]  // pass array directly — pg handles it
);

// UPSERT
await pool.query(
  `INSERT INTO settings (key, value, updated_at)
   VALUES ($1, $2, $3)
   ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`,
  [key, value, new Date().toISOString()]
);
```

### Supabase JS patterns (for reference — already in codebase)
```typescript
// Source: Context7 /supabase/supabase-js

// Select with count (no rows returned)
const { count } = await supabase
  .from('items')
  .select('*', { count: 'exact', head: true })
  .eq('feed_id', feedId);

// Select with OR filter
const { data: feed, error } = await supabase
  .from('feeds')
  .select('*')
  .or(`id.eq.${id},slug.eq.${id}`)
  .single();

// Upsert
const { error } = await supabase
  .from('settings')
  .upsert(
    { key, value: trimmedValue, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  );
```

### node-pg-migrate programmatic runner
```typescript
// Source: https://salsita.github.io/node-pg-migrate/api
import { runner } from 'node-pg-migrate';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations(): Promise<void> {
  await runner({
    databaseUrl: process.env.DATABASE_URL!,
    dir: join(__dirname, 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg) => logger.debug({ msg }, 'migration'),
  });
}
```

### Docker Compose healthcheck + depends_on pattern
```yaml
# Source: https://docs.docker.com/compose/how-tos/startup-order/
services:
  postgres:
    image: postgres:16-bookworm
    environment:
      POSTGRES_DB: rssservice
      POSTGRES_USER: rssuser
      POSTGRES_PASSWORD: rsspassword
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-scripts:/docker-entrypoint-initdb.d:ro

  app:
    build: .
    depends_on:
      postgres:
        condition: service_healthy
```

---

## Design Decisions (Resolved by Research)

These are the "Claude's Discretion" items resolved through codebase audit and research:

### API Surface Shape
**Decision: Mimic Supabase's chainable `.from().select()` API**

The codebase audit proves this is correct. Every caller uses the chainable API (`supabase.from('feeds').select(...).eq(...).single()`). Switching to a neutral interface would require changing every call site — violating the zero-route-change requirement. The pg adapter must speak the same chainable language.

### Abstraction Scope
**Decision: Implement only the 14 patterns currently used (not broader coverage)**

The codebase is well-defined. There are exactly 14 distinct operation shapes. Implementing them all is tractable (< 400 lines). Adding coverage for unused patterns adds risk and maintenance burden.

### Schema Approach
**Decision: Raw SQL migration files + node-pg-migrate runner**

- Docker init script (`/docker-entrypoint-initdb.d/001_initial_schema.sql`) handles first-volume creation (DB-02)
- `node-pg-migrate` runner handles subsequent schema evolution
- Both use the same `.sql` files — consistent, auditable, no ORM layer
- Avoids programmatic `CREATE TABLE IF NOT EXISTS` in application code (fragile, hard to evolve)

### Schema Evolution Strategy
**Decision: Additive migrations (numbered SQL files)**

New `002_*.sql`, `003_*.sql` files for each schema change. Never modify existing migration files. `node-pg-migrate` tracks which have been applied in its `pgmigrations` table.

### Schema Parity Level
**Decision: Functionally equivalent (not exact Supabase match)**

Supabase adds Row Level Security policies. Local pg runs without RLS — the app manages access by only allowing authenticated users at the application layer. Tables, columns, indexes, and foreign keys must match exactly. RLS policies are omitted for local pg.

### Debug/Query Logging
**Decision: Add `DB_DEBUG=true` environment variable**

When set, log every SQL query and its parameters. When unset, log nothing at query level. This matches the "debug level only" constraint for connection confirmation.

### Env Switching Mechanism
**Decision: Single `.env` file with DATABASE_URL present or absent**

- Supabase mode: `SUPABASE_URL` + `SUPABASE_ANON_KEY` set, no `DATABASE_URL`
- Local pg mode: `DATABASE_URL=postgresql://...` set, Supabase vars optional
- Docker Compose provides `DATABASE_URL` via environment block

### Error Parity
**Decision: Same categorized error shape, not identical underlying fields**

Both backends return `{ data, error }` where error is `{ code: string, message: string }`. The `code` values are normalized (not raw pg codes or Supabase codes). Route code already pattern-matches on `if (error || !data)` — this continues to work.

### Testing Strategy
**Decision: Trust the abstraction + manual smoke test of both backends**

Full integration tests against both backends would require a test postgres container in CI. For this phase: unit test the pg adapter query builder logic, and document a manual smoke test checklist for both backends.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pg.Client` with manual `connect()/end()` | `pg.Pool` with auto lifecycle | pg v6+ | Pool handles idle eviction, max connections, auto-reconnect — never use raw Client for long-lived apps |
| Docker `wait-for-it.sh` script | `depends_on: condition: service_healthy` | Docker Compose v2 | Healthcheck built into Compose — no external scripts needed |
| SQL migration file exec by hand | `node-pg-migrate` programmatic runner | node-pg-migrate v5+ | Tracks applied migrations in `pgmigrations` table, safe to run on every startup |

**Deprecated/outdated:**
- `@types/pg-pool`: Do not install — types are now bundled in `@types/pg`
- Manual `pg.connect()` retry loops: Use Pool's built-in `connectionTimeoutMillis` + an outer exponential backoff for startup only
- `docker-compose` v1 (standalone): Use `docker compose` v2 (plugin); `condition: service_healthy` requires Compose v2

---

## Open Questions

1. **Does node-pg-migrate runner work correctly with ES module (`"type": "module"`) projects?**
   - What we know: The project uses `"type": "module"` in `package.json`. node-pg-migrate CLI supports `--migration-file-language ts`. The programmatic `runner()` API accepts a `dir` path to SQL files.
   - What's unclear: Whether the ESM `import.meta.url` path resolution works cleanly with the `dir` option when transpiled to `dist/`.
   - Recommendation: Use `fileURLToPath(new URL('./migrations', import.meta.url))` for the `dir` path. Test in the build step (`npm run build && node dist/server.js`) not just in `tsx` dev mode.

2. **How to handle `pg` Pool `COUNT(*)` returning a string vs number**
   - What we know: PostgreSQL returns all numeric results as strings in the `pg` driver. `rows[0].count` will be `'42'` not `42`.
   - What's unclear: Whether to cast in SQL (`COUNT(*)::int`) or in the adapter layer.
   - Recommendation: Cast in SQL with `::int` to avoid all downstream surprises. Document this in the adapter.

3. **What happens to existing Supabase volume data when switching to local pg?**
   - What we know: They are separate storage backends. Supabase data stays in Supabase cloud. Local pg starts fresh.
   - What's unclear: Whether any migration guide or data export/import tooling is needed for developers switching between backends.
   - Recommendation: Out of scope for this phase — the phase boundary says "zero code changes in routes." Data migration is a separate operational concern. Document that backends are independent.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase-js` — insert, upsert, update, delete, select, error handling patterns
- `https://node-postgres.com/features/connecting` — DATABASE_URL / connectionString, environment variable auto-read, Pool constructor
- `https://node-postgres.com/apis/pool` — Pool options, pool.query(), error events, pool properties
- `https://node-postgres.com/apis/client` — parameterized queries, TypeScript usage, error handling
- `https://docs.docker.com/compose/how-tos/startup-order/` — healthcheck config, depends_on condition, pg_isready pattern
- `https://salsita.github.io/node-pg-migrate/api` — programmatic runner API, options
- Codebase audit: `src/routes/api/feeds.ts`, `src/routes/api/settings.ts`, `src/services/feed-builder.ts`, `src/services/youtube.ts`, `src/db/index.ts`, `src/db/schema.ts`, `supabase-schema.sql`

### Secondary (MEDIUM confidence)
- `https://node-postgres.com/features/pooling` — pool usage patterns (limited TypeScript examples)
- WebSearch: Docker init scripts for PostgreSQL — multiple concordant sources confirm `/docker-entrypoint-initdb.d/` behavior

### Tertiary (LOW confidence)
- WebSearch: exponential backoff patterns — general pattern well-established, specific implementation hand-rolled is fine for startup use case

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pg and @types/pg versions verified via `npm show`, node-pg-migrate version confirmed, supabase-js already installed
- Architecture: HIGH — based on direct codebase audit of all 6 files that use the Supabase client; operation inventory is exhaustive
- Pitfalls: HIGH for structural pitfalls (COUNT as string, .single() semantics, OR filter syntax) verified against official docs; MEDIUM for pg Pool error events (verified via node-postgres docs)
- Docker patterns: HIGH — verified against official Docker Compose docs

**Research date:** 2026-02-18
**Valid until:** 2026-04-18 (stable libraries — pg, supabase-js, node-pg-migrate are mature)
