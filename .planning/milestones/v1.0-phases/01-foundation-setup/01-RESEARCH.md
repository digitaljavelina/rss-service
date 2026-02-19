# Phase 1: Foundation & Setup - Research

**Researched:** 2026-02-16
**Domain:** Node.js/Express web application with SQLite, Tailwind CSS, and RSS feed serving
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for an RSS feed service: Express.js HTTP server, SQLite database with better-sqlite3, a clean minimal UI using Tailwind CSS with daisyUI components, and feed serving infrastructure. Research confirms the stack from project planning (Node.js + Express + SQLite + Tailwind) is well-supported with mature tooling.

The core pattern is a server-rendered MVC architecture using Alpine.js for minimal client-side interactivity. This avoids React/Vue complexity while delivering the "Linear/Notion-like" aesthetic through daisyUI's component library. Dark mode is handled via Tailwind's selector strategy with localStorage persistence.

**Primary recommendation:** Use daisyUI for UI components (pure CSS, no JS dependencies, built-in themes including dark mode), Alpine.js for interactivity, better-sqlite3 with WAL mode for persistence, and the `feed` library for RSS/Atom generation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.21.x | HTTP server, routing, middleware | De facto Node.js web framework, massive ecosystem |
| better-sqlite3 | ^11.x | SQLite database access | 15x faster than alternatives, synchronous API, WAL support |
| tailwindcss | ^4.x | Utility-first CSS framework | Industry standard, perfect for clean/minimal aesthetic |
| daisyui | ^5.x | UI component library | Pure CSS, 35+ themes, works with Tailwind, no JS deps |
| feed | ^5.x | RSS 2.0/Atom/JSON Feed generation | Battle-tested, full format support, clean API |
| alpinejs | ^3.x | Client-side interactivity | Lightweight (15KB), no build step, HTML-driven |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.x | URL-friendly unique ID generation | Feed ID slugs (fallback IDs like `f7k2m9`) |
| slugify | ^1.x | Human-readable URL slugs | Converting feed names to URL paths |
| get-port | ^7.x | Find available TCP port | Auto-find port if 3000 is taken |
| notyf | ^3.x | Toast notifications | Background error notifications |
| compression | ^1.x | Gzip compression middleware | Response compression |
| pino | ^9.x | Fast JSON logger | Production logging (not console.log) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| daisyUI | shadcn/ui | shadcn requires React; daisyUI is pure CSS |
| Alpine.js | htmx | htmx better for server-driven updates; Alpine better for client state |
| better-sqlite3 | sqlite3 | sqlite3 is async but 15x slower; better-sqlite3 sync API is simpler |
| Notyf | Toastify-js | Both lightweight; Notyf has better a11y and dark mode support |

**Installation:**
```bash
npm install express better-sqlite3 tailwindcss daisyui feed alpinejs nanoid slugify get-port notyf compression pino
npm install -D @types/better-sqlite3 @types/express typescript
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app.ts              # Express app setup, middleware
  server.ts           # Server startup, port handling
  db/
    index.ts          # Database connection, WAL mode
    schema.ts         # Table definitions, migrations
    queries/          # Prepared statement modules
  routes/
    index.ts          # Route aggregation
    feeds.ts          # /feeds/* routes (serving RSS)
    ui.ts             # Web UI routes
  services/
    feed-cache.ts     # In-memory feed caching
    feed-builder.ts   # RSS/Atom XML generation
  views/
    layouts/          # Base HTML layouts
    partials/         # Reusable components (sidebar, toast)
    pages/            # Full page templates
public/
  css/                # Compiled Tailwind output
  js/                 # Alpine.js, theme toggle
data/
  rss-service.db      # SQLite database file
```

### Pattern 1: Database Initialization with WAL Mode
**What:** Enable Write-Ahead Logging immediately after opening database connection
**When to use:** Always, on every database open
**Example:**
```typescript
// Source: https://github.com/WiseLibs/better-sqlite3
import Database from 'better-sqlite3';

const db = new Database('./data/rss-service.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export default db;
```

### Pattern 2: Feed Serving with Content Negotiation
**What:** Auto-detect RSS 2.0 vs Atom format based on Accept header
**When to use:** All /feeds/* endpoints
**Example:**
```typescript
// Source: Express.js content negotiation docs
import { Feed } from 'feed';

app.get('/feeds/:slug', (req, res) => {
  const feed = buildFeedFromDatabase(req.params.slug);

  res.format({
    'application/atom+xml': () => {
      res.type('application/atom+xml').send(feed.atom1());
    },
    'application/rss+xml': () => {
      res.type('application/rss+xml').send(feed.rss2());
    },
    default: () => {
      // Default to RSS 2.0 for maximum compatibility
      res.type('application/rss+xml').send(feed.rss2());
    }
  });
});
```

### Pattern 3: Dual Slug/ID URL Routing
**What:** Both human-readable slugs and generated IDs resolve to same feed
**When to use:** Feed URL resolution
**Example:**
```typescript
// Slugs: /feeds/hacker-news-top (from name)
// IDs: /feeds/f7k2m9 (nanoid fallback)
import slugify from 'slugify';
import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

function createFeedSlug(name: string): { slug: string; id: string } {
  const slug = slugify(name, { lower: true, strict: true });
  const id = generateId();
  return { slug: slug || id, id }; // Use ID as slug if name produces empty
}

// Route resolves either format
app.get('/feeds/:identifier', (req, res) => {
  const feed = db.prepare(`
    SELECT * FROM feeds WHERE slug = ? OR id = ?
  `).get(req.params.identifier, req.params.identifier);
  // ...
});
```

### Pattern 4: Dark Mode with localStorage Persistence
**What:** Three-way toggle (light/dark/system) with no flash
**When to use:** Theme management across the app
**Example:**
```html
<!-- Source: https://tailwindcss.com/docs/dark-mode -->
<!-- Inline in <head> to prevent flash of wrong theme -->
<script>
  document.documentElement.classList.toggle(
    'dark',
    localStorage.theme === 'dark' ||
      (!('theme' in localStorage) &&
       window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
</script>

<!-- Toggle button with Alpine.js -->
<div x-data="{
  theme: localStorage.theme || 'system',
  setTheme(t) {
    this.theme = t;
    if (t === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.theme = t;
    }
    document.documentElement.classList.toggle('dark',
      t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  }
}">
  <!-- Theme toggle UI -->
</div>
```

### Pattern 5: Auto-Port Selection
**What:** Find available port if default is taken
**When to use:** Server startup
**Example:**
```typescript
// Source: https://github.com/sindresorhus/get-port
import getPort, { portNumbers } from 'get-port';
import express from 'express';

const app = express();

async function startServer() {
  const port = await getPort({ port: portNumbers(3000, 3100) });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
```

### Anti-Patterns to Avoid
- **Async SQLite:** better-sqlite3's sync API is intentionally faster; don't wrap in Promises
- **Hand-rolling XML:** Always use the `feed` library for RSS/Atom generation
- **console.log in production:** Use pino for structured logging
- **Storing theme in server session:** Use localStorage; theme is client-side only
- **Complex build pipelines:** Alpine.js and Tailwind can work with minimal tooling

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS/Atom XML generation | String concatenation | `feed` library | XML escaping, date formats, required fields, namespaces |
| URL slug generation | regex replace | `slugify` library | Unicode handling, special chars, edge cases |
| Unique ID generation | Math.random | `nanoid` | Cryptographically secure, URL-safe, collision-resistant |
| Port availability check | net.createServer loop | `get-port` | Race conditions, proper cleanup, range support |
| Toast notifications | Custom div animations | `notyf` | A11y, queuing, positioning, timing |
| Dark mode toggle | Custom CSS variables | Tailwind dark variant | daisyUI themes, system preference detection |
| Component styling | Raw Tailwind utilities | daisyUI classes | Consistent design system, less code |

**Key insight:** The foundation phase should maximize use of battle-tested libraries to establish a solid base. Custom code should focus on business logic (feed management, caching strategy), not infrastructure.

## Common Pitfalls

### Pitfall 1: SQLite Foreign Keys Disabled by Default
**What goes wrong:** Foreign key constraints silently ignored, orphan records accumulate
**Why it happens:** SQLite disables FK enforcement by default for backwards compatibility
**How to avoid:** Run `PRAGMA foreign_keys = ON` immediately after opening connection
**Warning signs:** Deleting a feed doesn't delete its items; orphan items in database

### Pitfall 2: Flash of Wrong Theme (FOUC)
**What goes wrong:** Page loads in light mode, flashes to dark mode after JS runs
**Why it happens:** Theme detection runs after initial paint
**How to avoid:** Inline theme detection script in `<head>` before any content
**Warning signs:** Brief flash on page load when user has dark mode preference

### Pitfall 3: Invalid RSS Feed Structure
**What goes wrong:** Feed readers reject feeds, no items displayed
**Why it happens:** Missing required fields, invalid date formats, unescaped XML
**How to avoid:** Use `feed` library exclusively; never construct XML manually
**Warning signs:** Feed validator errors, items not appearing in readers

### Pitfall 4: Synchronous File Operations Blocking Event Loop
**What goes wrong:** Server becomes unresponsive during database operations
**Why it happens:** Misunderstanding better-sqlite3's sync API
**How to avoid:** better-sqlite3's sync API is actually fine (implemented in C++, doesn't block Node's event loop); use connection pooling for heavy loads
**Warning signs:** Only a problem at very high concurrency (thousands of concurrent requests)

### Pitfall 5: Cache-Control Headers Missing for Feeds
**What goes wrong:** Feed readers hammer server on every refresh
**Why it happens:** Forgetting to set caching headers on feed responses
**How to avoid:** Set appropriate Cache-Control and ETag headers
**Warning signs:** Excessive server load, slow feed responses

### Pitfall 6: Database File Not Auto-Created
**What goes wrong:** App crashes on first run when data/ directory doesn't exist
**Why it happens:** SQLite can create the file but not parent directories
**How to avoid:** Ensure `data/` directory exists before opening database
**Warning signs:** SQLITE_CANTOPEN error on startup

## Code Examples

Verified patterns from official sources:

### Database Schema with Foreign Keys and Indexes
```typescript
// Source: SQLite best practices
const schema = `
  CREATE TABLE IF NOT EXISTS feeds (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    item_limit INTEGER DEFAULT 100
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    feed_id TEXT NOT NULL,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT,
    pub_date TEXT,
    guid TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_items_feed_id ON items(feed_id);
  CREATE INDEX IF NOT EXISTS idx_items_pub_date ON items(pub_date);
  CREATE INDEX IF NOT EXISTS idx_feeds_slug ON feeds(slug);
`;

db.exec(schema);
```

### Express App Setup with Middleware
```typescript
// Source: https://expressjs.com/en/advanced/best-practice-performance.html
import express from 'express';
import compression from 'compression';
import path from 'path';

const app = express();

// Compression first
app.use(compression());

// Static files with caching
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine (using simple HTML templates)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

export default app;
```

### Feed Generation with Caching
```typescript
// Source: https://github.com/jpmonette/feed
import { Feed } from 'feed';

interface FeedData {
  id: string;
  name: string;
  items: Array<{
    title: string;
    link: string;
    description?: string;
    date: Date;
    guid: string;
  }>;
}

// Simple in-memory cache
const feedCache = new Map<string, { xml: string; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function generateFeed(data: FeedData, format: 'rss2' | 'atom1'): string {
  const cacheKey = `${data.id}:${format}`;
  const cached = feedCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.xml;
  }

  const feed = new Feed({
    title: data.name,
    id: `http://localhost:3000/feeds/${data.id}`,
    link: `http://localhost:3000/feeds/${data.id}`,
    copyright: '',
  });

  data.items.forEach(item => {
    feed.addItem({
      title: item.title,
      id: item.guid,
      link: item.link,
      description: item.description,
      date: item.date,
    });
  });

  const xml = format === 'atom1' ? feed.atom1() : feed.rss2();

  feedCache.set(cacheKey, {
    xml,
    expires: Date.now() + CACHE_TTL
  });

  return xml;
}
```

### daisyUI Component with Dark Mode
```html
<!-- Source: https://daisyui.com/ -->
<!-- Sidebar navigation component -->
<aside class="w-64 min-h-screen bg-base-200">
  <div class="p-4">
    <h1 class="text-xl font-bold text-base-content">RSS Service</h1>
  </div>

  <ul class="menu p-4 text-base-content">
    <li><a class="active">Dashboard</a></li>
    <li><a>My Feeds</a></li>
    <li><a>Create Feed</a></li>
    <li><a>Settings</a></li>
  </ul>

  <!-- Theme toggle -->
  <div class="p-4 mt-auto">
    <label class="swap swap-rotate">
      <input type="checkbox" class="theme-controller" value="dark" />
      <svg class="swap-on h-6 w-6 fill-current" viewBox="0 0 24 24">
        <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17Z"/>
      </svg>
      <svg class="swap-off h-6 w-6 fill-current" viewBox="0 0 24 24">
        <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49"/>
      </svg>
    </label>
  </div>
</aside>
```

### Toast Notifications Setup
```typescript
// Source: https://carlosroso.com/notyf/
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

const notyf = new Notyf({
  duration: 4000,
  position: { x: 'right', y: 'bottom' },
  ripple: true,
  dismissible: true,
  types: [
    {
      type: 'success',
      background: 'var(--color-success)',
      icon: false
    },
    {
      type: 'error',
      background: 'var(--color-error)',
      icon: false
    }
  ]
});

// Usage
notyf.success('Feed created successfully');
notyf.error('Failed to fetch content');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sqlite3 (async) | better-sqlite3 (sync) | 2020+ | 15x performance improvement, simpler code |
| Bootstrap/jQuery | Tailwind + Alpine.js | 2022+ | Smaller bundles, better DX, no JS framework lock-in |
| Custom dark mode CSS | Tailwind dark variant | Tailwind v3+ | Built-in, system preference aware |
| uuid for IDs | nanoid | 2020+ | 60% shorter IDs, URL-safe, faster |
| Custom component CSS | daisyUI | 2021+ | Consistent design, 35+ themes, pure CSS |
| console.log | pino | Always | 10x faster, structured JSON, log levels |

**Deprecated/outdated:**
- `sqlite3` npm package: Replaced by better-sqlite3 for performance
- `class` strategy for Tailwind dark mode: Now `selector` strategy (v3.4.1+)
- React/Vue for simple apps: Overkill; Alpine.js sufficient for interactivity

## Open Questions

Things that couldn't be fully resolved:

1. **daisyUI theme customization depth**
   - What we know: 35+ built-in themes, CSS variable based
   - What's unclear: Exact process for creating custom "Linear-like" theme
   - Recommendation: Start with `dark` theme, customize colors via CSS variables if needed

2. **Quick-start wizard implementation**
   - What we know: Alpine.js can handle multi-step forms
   - What's unclear: Best pattern for wizard state management across steps
   - Recommendation: Single x-data object with step counter, localStorage persistence

3. **Feed caching invalidation strategy**
   - What we know: In-memory cache with TTL works for basic caching
   - What's unclear: Best invalidation approach when feed is manually refreshed
   - Recommendation: Clear cache entry on manual refresh; 5-minute TTL for automatic expiry

## Sources

### Primary (HIGH confidence)
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html) - Production setup, caching, middleware
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) - WAL mode, API patterns, performance
- [Tailwind CSS Dark Mode Docs](https://tailwindcss.com/docs/dark-mode) - Selector strategy, localStorage pattern
- [daisyUI Docs](https://daisyui.com/) - Installation, theming, components
- [feed npm package](https://github.com/jpmonette/feed) - RSS/Atom generation API
- [Alpine.js Docs](https://alpinejs.dev/start-here) - Core directives, state management

### Secondary (MEDIUM confidence)
- [get-port npm](https://www.npmjs.com/package/get-port) - Port selection API (verified via multiple sources)
- [nanoid GitHub](https://github.com/ai/nanoid) - Custom alphabet, URL-safe IDs
- [SQLite Foreign Key Support](https://sqlite.org/foreignkeys.html) - PRAGMA requirements
- [Notyf GitHub](https://github.com/caroso1222/notyf) - Toast notification patterns

### Tertiary (LOW confidence)
- Express MVC structure recommendations (multiple blog sources, no single authority)
- Specific caching TTL recommendations (context-dependent, needs validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs and npm
- Architecture: HIGH - MVC patterns well-established for Express
- Pitfalls: HIGH - Documented in official sources (SQLite, Tailwind)
- UI recommendations: MEDIUM - daisyUI over shadcn is judgment call based on project constraints (no React)

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable stack, mature libraries)
