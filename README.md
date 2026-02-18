# RSS Service

Create RSS feeds from anything. Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

## Live Demo

**Production:** https://rss-service-five.vercel.app/

## Features

- **URL to RSS** - Turn any webpage into an RSS feed
- **Auto-Detection** - Automatically finds content patterns (articles, lists, links)
- **Headless Browser** - Opt-in browser rendering for JavaScript-heavy sites (SPAs, React apps)
- **JS-Need Detection** - Suggests headless mode when static extraction finds minimal content
- **Selector Adjustment** - View and edit auto-detected CSS selectors, re-preview with changes
- **Preview Before Save** - See what you'll get before creating the feed
- **Multiple Formats** - RSS 2.0 and Atom support
- **Feed Dashboard** - View all feeds with status, item count, and last updated time
- **Edit Feeds** - Update feed name, URL, or selectors with automatic re-detection
- **Delete Feeds** - Remove feeds with confirmation dialog
- **Manual Refresh** - Update individual feeds on demand with single-row updates
- **Export/Import** - Download feed configs as JSON for backup, restore from JSON files
- **XML Export** - Download feeds as static RSS or Atom XML files
- **Content Deduplication** - SHA-256 based GUIDs prevent duplicate items
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
  item_limit INTEGER DEFAULT 100
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_feed_id ON items(feed_id);
CREATE INDEX IF NOT EXISTS idx_items_pub_date ON items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_slug ON feeds(slug);

-- Enable RLS
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for single-user app)
CREATE POLICY "Allow all on feeds" ON feeds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
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
  "url": "https://example.com",
  "useHeadless": false,
  "selectors": { "item": ".post", "title": "h2" }
}
```

Auto-detects content and returns extracted items for preview.

**Options:**
- `useHeadless` (optional): Use headless browser for JS-heavy sites
- `selectors` (optional): Override auto-detected CSS selectors

**Response includes:**
- `suggestHeadless`: `true` if page appears to need JavaScript rendering

### Create Feed

```
POST /api/feeds
Content-Type: application/json

{
  "name": "My Feed",
  "url": "https://example.com",
  "useHeadless": false
}
```

Creates a new feed with auto-detected selectors.

**Options:**
- `useHeadless` (optional): Store headless preference for future refreshes

### List Feeds

```
GET /api/feeds
```

Returns all feeds with item counts.

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

{ "name": "Updated Name", "url": "https://example.com/new" }
```

Updates feed configuration. If URL changes, items are cleared and re-fetched. Response includes `urlChanged: true` when URL was modified.

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
| `/feeds/:slug` | RSS/Atom feed output |

## Deployment Notes

The Vercel deployment is configured with:
- **Memory:** 1024 MB (for headless browser)
- **Max Duration:** 60 seconds (for browser-based fetching)

## Project Status

| Phase | Status |
|-------|--------|
| 1. Foundation & Setup | ✅ Complete |
| 2. Core Feed Creation | ✅ Complete |
| 3. Feed Management | ✅ Complete |
| 4. Advanced Extraction | ✅ Complete |
| 5. Automation & Scheduling | ⏳ Planned |
| 6. Platform Integrations | ⏳ Planned |

## License

MIT
