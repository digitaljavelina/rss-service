# RSS Service

Create RSS feeds from anything. Point at any URL — website, YouTube channel, or subreddit — and get a feed you can subscribe to in your reader.

## Features

- **URL to RSS** - Turn any webpage into an RSS feed
- **YouTube Feeds** - Create feeds from YouTube channels and playlists (auto-detected from URL)
- **Reddit Feeds** - Create feeds from subreddits and user pages (auto-detected from URL)
- **Auto-Detection** - Automatically finds content patterns and detects platform type
- **Automatic JS Rendering** - Uses headless browser for JavaScript-heavy sites (SPAs, React apps)
- **Preview Before Save** - See what you'll get before creating the feed
- **Multiple Formats** - RSS 2.0 and Atom support
- **Responsive Layout** - Collapsible drawer sidebar for mobile, always-open on desktop
- **Smart Home Page** - Redirects to feeds if you have any, shows onboarding if empty
- **Feed Dashboard** - View all feeds with platform badges, item count, and refresh status
- **Edit Feeds** - Update feed name, URL, or selectors with automatic re-detection
- **Delete Feeds** - Remove feeds with confirmation dialog
- **Manual Refresh** - Update individual feeds on demand
- **Auto-Refresh** - Configurable schedules (15min, 30min, hourly, 6hr, daily)
- **Export/Import** - Download feed configs as JSON for backup, restore from JSON files
- **XML Export** - Download feeds as static RSS or Atom XML files
- **Content Deduplication** - SHA-256 based GUIDs prevent duplicate items
- **Settings Page** - Manage YouTube API key with save, test, and remove
- **Dark Mode** - Light and dark theme with persistence

## Tech Stack

- **Runtime:** Node.js + Express
- **Database:** PostgreSQL
- **Styling:** Tailwind CSS v4 + daisyUI
- **Hosting:** Docker (self-hosted)
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (or use Docker Compose which bundles it)
- YouTube Data API v3 key (optional, for YouTube feeds)

### Installation

```bash
# Clone the repository
git clone https://github.com/digitaljavelina/rss-service.git
cd rss-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection details
```

### Environment Variables

```
DATABASE_URL=postgresql://rssuser:rsspassword@localhost:5432/rssservice
BASE_URL=http://localhost:3000
```

Database migrations run automatically on startup via `node-pg-migrate`.

### YouTube Setup

YouTube feeds require a Data API v3 key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **YouTube Data API v3**
3. Create an API key under **Credentials**
4. In the app, go to **Settings** and save your API key

Reddit feeds work out of the box — no API key needed.

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

Auto-detects content and returns extracted items for preview. Supports web pages, YouTube channels/playlists, and Reddit subreddits/users. Automatically uses headless browser for JavaScript-heavy sites.

### Create Feed

```
POST /api/feeds
Content-Type: application/json

{
  "name": "My Feed",
  "url": "https://example.com",
  "refresh_interval_minutes": 60
}
```

Creates a new feed. Platform type (web, youtube, reddit) is auto-detected from the URL. If `refresh_interval_minutes` is provided, `next_refresh_at` is set automatically.

### List Feeds

```
GET /api/feeds
```

Returns all feeds with item counts, refresh timing, and `feed_type`.

### Get Feed (JSON)

```
GET /api/feeds/:id
```

Returns feed details, items, `feedType`, and `platformConfig` as JSON.

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
  "refresh_interval_minutes": 30
}
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

Manually refresh a feed to check for new content. Routes to the correct service based on feed type (web scraping, YouTube API, or Reddit RSS).

### Settings

```
GET /api/settings              # List all settings (values masked)
PUT /api/settings/:key         # Save a setting
DELETE /api/settings/:key      # Remove a setting
```

Used for managing API keys (e.g., `youtube_api_key`). Sensitive values are masked in GET responses.

### Export Feed (XML)

```
GET /api/feeds/:id/export?format=rss
GET /api/feeds/:id/export?format=atom
```

Download feed as XML file.


## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page (redirects to `/feeds` if feeds exist) |
| `/create` | Create a new feed (URL + preview + save) |
| `/feeds` | Dashboard — list all feeds with actions |
| `/feeds/:slug/edit` | Edit feed configuration |
| `/settings` | Settings — API key management |
| `/feeds/:slug` | RSS/Atom feed output |

## Deployment

### Docker (Self-Hosted)

The recommended way to self-host. Includes PostgreSQL, headless Chromium, and in-process cron scheduling.

```bash
# Clone and configure
git clone https://github.com/digitaljavelina/rss-service.git
cd rss-service
cp .env.docker.example .env.docker
```

Edit `.env.docker` with your settings:

```
POSTGRES_PASSWORD=your_secure_password
BASE_URL=https://rss.yourdomain.com   # Your reverse proxy URL
```

```bash
# Create the external network (if using a reverse proxy like Caddy)
docker network create homelab-network

# Start the service
docker compose up -d --build

# Check health
curl http://localhost:3000/health
```

The compose file uses an external `homelab-network` network, making it easy to connect with a reverse proxy (Caddy, nginx, Traefik). If you don't need an external network, remove the `networks` sections from `docker-compose.yml` and Docker will create an internal one automatically.

Auto-refresh runs in-process via node-cron — no external cron needed.

## License

MIT
