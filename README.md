# RSS Service

Create RSS feeds from anything. Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

## Live Demo

**Production:** https://rss-service-five.vercel.app/

## Features

- **URL to RSS** - Turn any webpage into an RSS feed
- **Auto-Detection** - Automatically finds content patterns (articles, lists, links)
- **Automatic JS Rendering** - Automatically uses headless browser for JavaScript-heavy sites (SPAs, React apps)
- **Preview Before Save** - See what you'll get before creating the feed
- **Multiple Formats** - RSS 2.0 and Atom support
- **Feed Dashboard** - View all feeds with status, item count, and last updated time
- **Edit Feeds** - Update feed name, URL, or selectors with automatic re-detection
- **Delete Feeds** - Remove feeds with confirmation dialog
- **Manual Refresh** - Update individual feeds on demand with single-row updates
- **Auto-Refresh** - Feeds update automatically on configurable schedules (15min, 30min, hourly, daily)
- **Refresh Status** - Dashboard shows last updated time, next refresh, and status for each feed
- **Export/Import** - Download feed configs as JSON for backup, restore from JSON files
- **XML Export** - Download feeds as static RSS or Atom XML files
- **Content Deduplication** - SHA-256 based GUIDs prevent duplicate items
- **YouTube Feeds** - Create feeds from YouTube channels and playlists via Data API v3
- **Reddit Feeds** - Create feeds from subreddits and user pages via built-in RSS
- **Settings Page** - Manage API keys (YouTube) with save, test, and remove
- **Dark Mode** - Light and dark theme with persistence

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS v4 + daisyUI
- **Hosting:** Vercel (serverless)
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/digitaljavelina/rss-service.git
cd rss-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Environment Variables

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
BASE_URL=http://localhost:3000
CRON_SECRET=your_cron_secret  # Required for scheduled auto-refresh (generate with: openssl rand -hex 32)
```

### Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  selectors TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_limit INTEGER DEFAULT 100,
  refresh_interval_minutes INTEGER,          -- NULL = manual only; 15, 30, 60, 1440 = scheduled
  next_refresh_at TIMESTAMPTZ,              -- When the feed should next be refreshed
  refresh_status TEXT DEFAULT 'idle',       -- idle | refreshing | error
  last_refresh_error TEXT,                  -- Error message from last failed refresh
  feed_type TEXT NOT NULL DEFAULT 'web',   -- web | youtube | reddit
  platform_config JSONB NOT NULL DEFAULT '{}'  -- Platform-specific config (channelId, playlistId, etc.)
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  title TEXT,
  link TEXT,
  description TEXT,
  pub_date TIMESTAMPTZ,
  guid TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Settings table (API keys)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feeds_feed_type ON feeds(feed_type);
CREATE INDEX IF NOT EXISTS idx_items_feed_id ON items(feed_id);
CREATE INDEX IF NOT EXISTS idx_items_pub_date ON items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_slug ON feeds(slug);
CREATE INDEX IF NOT EXISTS idx_feeds_next_refresh ON feeds(next_refresh_at) WHERE next_refresh_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feeds_refresh_status ON feeds(refresh_status);

-- Enable RLS
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for single-user app)
CREATE POLICY "Allow all on feeds" ON feeds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
```

### Development

```bash
# Start development server (with hot reload)
npm run dev

# Build CSS only
npm run build:css

# Build for production
npm run build

# Start production server
npm start
```

## API

### Preview URL

```
POST /api/preview
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Auto-detects content and returns extracted items for preview. Automatically uses headless browser for JavaScript-heavy sites.

**Response includes:**
- `usedHeadless`: `true` if headless browser was used

### Create Feed

```
POST /api/feeds
Content-Type: application/json

{
  "name": "My Feed",
  "url": "https://example.com",
  "refresh_interval_minutes": 60   // Optional: 15, 30, 60, 1440, or null for manual only
}
```

Creates a new feed with auto-detected selectors. If `refresh_interval_minutes` is provided, `next_refresh_at` is set automatically.

### List Feeds

```
GET /api/feeds
```

Returns all feeds with item counts and refresh timing:
- `refresh_interval_minutes`: How often the feed auto-refreshes (null = manual only)
- `next_refresh_at`: ISO 8601 timestamp of next scheduled refresh (null = manual only)
- `refresh_status`: Current status — `idle`, `refreshing`, or `error`
- `last_refresh_error`: Error message from last failed refresh (null if no error)

### Get Feed (JSON)

```
GET /api/feeds/:id
```

Returns feed details and items as JSON.

### Get Feed (RSS/Atom)

```
GET /feeds/:slug
```

Returns RSS 2.0 by default. Request Atom with `Accept: application/atom+xml` header.

### Update Feed

```
PUT /api/feeds/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "url": "https://example.com/new",
  "refresh_interval_minutes": 30   // Optional: 15, 30, 60, 1440, or null for manual only
}
```

Updates feed configuration. If URL changes, items are cleared and re-fetched. Response includes `urlChanged: true` when URL was modified. If `refresh_interval_minutes` changes, `next_refresh_at` is recalculated.

### Delete Feed

```
DELETE /api/feeds/:id
```

Permanently removes feed and all associated items.

### Refresh Feed

```
POST /api/feeds/:id/refresh
```

Manually refresh a feed to check for new content. Uses content-based deduplication to avoid duplicates.

### Cron Scheduler (Internal)

```
GET /api/cron/scheduler
Authorization: Bearer <CRON_SECRET>
```

Called automatically by Vercel Cron once daily (midnight UTC on Hobby plan). Finds feeds whose `next_refresh_at` is in the past, refreshes up to 5 per run, and updates `next_refresh_at` for the next cycle. Self-hosted deployments can trigger this endpoint at any frequency. Requires `CRON_SECRET` environment variable.

### Export Feed (XML)

```
GET /api/feeds/:id/export?format=rss
GET /api/feeds/:id/export?format=atom
```

Download feed as XML file with `Content-Disposition` header for browser download.

**Response Headers:**
- `Content-Type: application/rss+xml` or `application/atom+xml`
- `Cache-Control: public, max-age=300`
- `ETag: "..."` for cache validation

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/feeds/new` | Create a new feed (URL + preview + save) |
| `/feeds` | Dashboard — list all feeds with actions |
| `/feeds/:slug/edit` | Edit feed configuration |
| `/settings` | Settings — API key management |
| `/feeds/:slug` | RSS/Atom feed output |

## Deployment Notes

The Vercel deployment is configured with:
- **Memory:** 1024 MB (for headless browser)
- **Max Duration:** 60 seconds (for browser-based fetching)

### Auto-Refresh Setup (Phase 5)

Vercel Cron triggers the scheduler on a schedule configured in `vercel.json`. To enable auto-refresh in production:

1. Generate a cron secret: `openssl rand -hex 32`
2. Add `CRON_SECRET` to your Vercel Dashboard environment variables
3. Vercel Hobby plan limits cron to once per day (`0 0 * * *`). Upgrade to Pro for higher frequency.
4. **Self-hosted** (Docker, launchd, etc.) can call `/api/cron/scheduler` at any frequency with no limits

## Project Status

| Phase | Status |
|-------|--------|
| 1. Foundation & Setup | ✅ Complete |
| 2. Core Feed Creation | ✅ Complete |
| 3. Feed Management | ✅ Complete |
| 4. Advanced Extraction | ✅ Complete |
| 5. Automation & Scheduling | ✅ Complete |
| 6. Platform Integrations | ✅ Complete |

## License

MIT
