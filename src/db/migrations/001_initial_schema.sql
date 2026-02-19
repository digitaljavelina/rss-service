-- feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  selectors TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_limit INTEGER DEFAULT 100,
  refresh_interval_minutes INTEGER,
  next_refresh_at TIMESTAMPTZ,
  refresh_status TEXT NOT NULL DEFAULT 'idle',
  last_refresh_error TEXT,
  feed_type TEXT NOT NULL DEFAULT 'web',
  platform_config JSONB NOT NULL DEFAULT '{}'
);

-- items table
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

-- settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_feed_id ON items(feed_id);
CREATE INDEX IF NOT EXISTS idx_items_pub_date ON items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_slug ON feeds(slug);
CREATE INDEX IF NOT EXISTS idx_feeds_next_refresh ON feeds(next_refresh_at);
CREATE INDEX IF NOT EXISTS idx_feeds_refresh_status ON feeds(refresh_status);
CREATE INDEX IF NOT EXISTS idx_feeds_feed_type ON feeds(feed_type);
