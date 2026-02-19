# Phase 6 Research: Platform Integrations

## Scope (Revised)

Original scope: YouTube, Twitter/X, Reddit via official APIs.

**Revised scope after feasibility review:**
- **YouTube** — YouTube Data API v3 (API key required, free tier: 10,000 units/day)
- **Reddit** — Built-in RSS feeds (no API key needed; reddit.com/r/sub.rss)
- **Twitter/X** — **Dropped** (read access requires $100+/month paid API tier)

## YouTube Data API v3

### Authentication
- Requires a Google API key (not OAuth — read-only access is sufficient)
- Key is created in Google Cloud Console → APIs & Services → Credentials
- Free quota: 10,000 units/day (resets at midnight Pacific Time)

### Key Endpoints
- `GET /youtube/v3/channels` — Resolve channel by ID, username, or handle (1 unit)
- `GET /youtube/v3/search` — Search videos by channel (100 units per call!)
- `GET /youtube/v3/playlistItems` — List videos in a playlist (1 unit)
- `GET /youtube/v3/videos` — Get video details like title, description, publish date (1 unit)

### URL Patterns to Support
- `youtube.com/channel/UCxxxxxx` — Channel ID directly
- `youtube.com/@handle` — Handle (needs resolution via channels API)
- `youtube.com/c/ChannelName` — Custom URL (needs resolution)
- `youtube.com/user/username` — Legacy username (needs resolution)
- `youtube.com/playlist?list=PLxxxxxx` — Playlist ID directly

### Strategy: Avoid Search API (100 units)
Every channel has a hidden "Uploads" playlist (UU + channel ID suffix).
- Resolve channel → get `uploads` playlist ID from `contentDetails.relatedPlaylists.uploads`
- Use `playlistItems.list` (1 unit) instead of `search.list` (100 units)
- This is 100x more quota-efficient

### Rate Limit Handling
- Track remaining quota per day (estimated, not API-provided)
- Return clear error when quota likely exhausted
- No exponential backoff needed (daily quota, not per-second)

### Video → Feed Item Mapping
```
title → video title (snippet.title)
link → https://www.youtube.com/watch?v={videoId}
description → video description (snippet.description), truncated
pubDate → snippet.publishedAt (ISO 8601)
guid → SHA-256 of feedId:title:videoUrl
```

## Reddit Built-in RSS

### Available Feeds (no API key needed)
- `reddit.com/r/{subreddit}.rss` — Subreddit posts
- `reddit.com/r/{subreddit}/new.rss` — Subreddit new posts
- `reddit.com/r/{subreddit}/top.rss` — Top posts
- `reddit.com/u/{username}.rss` — User posts
- `reddit.com/user/{username}/submitted.rss` — User submissions

### URL Patterns to Support
- `reddit.com/r/programming` → append `.rss`
- `reddit.com/r/programming/new` → append `.rss`
- `reddit.com/u/spez` → derive `/u/spez.rss`

### RSS Parsing
Reddit RSS is standard Atom format. Parse with `cheerio` or a lightweight XML parser.
The existing `feed` library can also parse RSS/Atom, but we only use it for generation.
Use `cheerio` for consistency with the rest of the codebase.

### Feed Item Mapping
```
title → <title> element
link → <link> element
description → <content:encoded> or <description>, strip HTML
pubDate → <pubDate> or <updated>
guid → SHA-256 of feedId:title:link
```

### Rate Limits
Reddit returns 429 Too Many Requests if fetched too frequently.
Standard User-Agent header required: `RSS-Service/1.0 (by /u/yourname)`
Respect Cache-Control headers from response.

## Database Changes

### feeds table additions
- `feed_type TEXT DEFAULT 'web'` — 'web' | 'youtube' | 'reddit'
- `platform_config JSONB DEFAULT '{}'` — Platform-specific metadata:
  - YouTube: `{ channelId, playlistId, channelTitle }`
  - Reddit: `{ subreddit, sort, feedUrl }`
  - Web: `{}` (empty, uses existing selectors field)

### settings table (new)
- `key TEXT PRIMARY KEY`
- `value TEXT`
- `updated_at TIMESTAMPTZ DEFAULT now()`

Stores: `youtube_api_key` (single global key for all YouTube feeds)

## UI Changes

### Create Feed Page
Add a platform type selector (tabs or radio buttons):
- **Web** (default) — Current flow: URL → auto-detect → preview → save
- **YouTube** — Channel/playlist URL → API preview → save
- **Reddit** — Subreddit/user URL → RSS preview → save

### Settings Page
- YouTube API Key input (masked, with test button)
- Link to Google Cloud Console for key creation

### Dashboard
- Show platform icon/badge next to feed name (Web/YT/Reddit)

## Plan Breakdown

1. **06-01**: Database schema + settings infrastructure
2. **06-02**: YouTube service + API integration
3. **06-03**: Reddit RSS service
4. **06-04**: UI updates (create form, settings page, dashboard badges)
5. **06-05**: Scheduler updates + README + verification
