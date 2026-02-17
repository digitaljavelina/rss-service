# RSS Service

Create RSS feeds from anything. Point at any URL, select what content matters, and get a feed you can subscribe to in your reader.

## Live Demo

**Production:** https://rss-service-five.vercel.app/

## Features

- **URL to RSS** - Turn any webpage into an RSS feed
- **Auto-Detection** - Automatically finds content patterns (articles, lists, links)
- **Preview Before Save** - See what you'll get before creating the feed
- **Multiple Formats** - RSS 2.0 and Atom support
- **Feed Export** - Download feeds as XML files
- **Manual Refresh** - Update feeds on demand
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

{ "url": "https://example.com" }
```

Auto-detects content and returns extracted items for preview.

### Create Feed

```
POST /api/feeds
Content-Type: application/json

{ "name": "My Feed", "url": "https://example.com" }
```

Creates a new feed with auto-detected selectors.

### Get Feed (RSS/Atom)

```
GET /feeds/:slug
```

Returns RSS 2.0 by default. Request Atom with `Accept: application/atom+xml` header.

### Refresh Feed

```
POST /api/feeds/:id/refresh
```

Manually refresh a feed to check for new content.

### Export Feed

```
GET /api/feeds/:id/export?format=rss
GET /api/feeds/:id/export?format=atom
```

Download feed as XML file.

**Response Headers:**
- `Content-Type: application/rss+xml` or `application/atom+xml`
- `Cache-Control: public, max-age=300`
- `ETag: "..."` for cache validation

## Project Status

| Phase | Status |
|-------|--------|
| 1. Foundation & Setup | ✅ Complete |
| 2. Core Feed Creation | ✅ Complete |
| 3. Feed Management | ⏳ Planned |
| 4. Advanced Extraction | ⏳ Planned |
| 5. Automation & Scheduling | ⏳ Planned |
| 6. Platform Integrations | ⏳ Planned |

## License

MIT
