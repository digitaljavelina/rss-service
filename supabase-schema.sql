-- RSS Service Schema for Supabase
-- Run this in the Supabase SQL Editor (Database > SQL Editor)

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_items_feed_id ON items(feed_id);
CREATE INDEX IF NOT EXISTS idx_items_pub_date ON items(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_slug ON feeds(slug);

-- Enable Row Level Security
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policies to allow all operations (single-user app, no auth required)
CREATE POLICY "Allow all on feeds" ON feeds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);

-- Phase 5: Scheduling columns (added via ALTER TABLE in production)
-- ALTER TABLE feeds ADD COLUMN IF NOT EXISTS refresh_interval_minutes INTEGER;
-- ALTER TABLE feeds ADD COLUMN IF NOT EXISTS next_refresh_at TIMESTAMPTZ;
-- ALTER TABLE feeds ADD COLUMN IF NOT EXISTS refresh_status TEXT NOT NULL DEFAULT 'idle';
-- ALTER TABLE feeds ADD COLUMN IF NOT EXISTS last_refresh_error TEXT;
-- CREATE INDEX IF NOT EXISTS idx_feeds_next_refresh ON feeds(next_refresh_at);
-- CREATE INDEX IF NOT EXISTS idx_feeds_refresh_status ON feeds(refresh_status);

-- Phase 6: Platform integrations
-- Run these in Supabase SQL Editor:

-- Feed type column (web, youtube, reddit)
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS feed_type TEXT NOT NULL DEFAULT 'web';

-- Platform-specific configuration (JSON)
ALTER TABLE feeds ADD COLUMN IF NOT EXISTS platform_config JSONB NOT NULL DEFAULT '{}';

-- Index for filtering by feed type
CREATE INDEX IF NOT EXISTS idx_feeds_feed_type ON feeds(feed_type);

-- Settings table for API keys and global configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
