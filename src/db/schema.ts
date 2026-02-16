import { supabase } from './index.js';

/**
 * Initialize database schema in Supabase
 * Note: Tables should be created via Supabase Dashboard or migrations
 * This function verifies the connection and logs table status
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection by querying feeds table
    const { error } = await supabase.from('feeds').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.error('Tables not found. Please create them in Supabase Dashboard.');
        console.error('Run the SQL from schema.sql in the Supabase SQL Editor.');
        throw new Error('Database tables not initialized');
      }
      throw error;
    }

    console.log('Database connection verified successfully');
  } catch (error) {
    console.error('Failed to verify database connection:', error);
    throw error;
  }
}

/**
 * SQL to create tables in Supabase (run in SQL Editor):
 *
 * -- Feeds table
 * CREATE TABLE IF NOT EXISTS feeds (
 *   id TEXT PRIMARY KEY,
 *   slug TEXT UNIQUE NOT NULL,
 *   name TEXT NOT NULL,
 *   url TEXT,
 *   selectors TEXT,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   item_limit INTEGER DEFAULT 100
 * );
 *
 * -- Items table
 * CREATE TABLE IF NOT EXISTS items (
 *   id TEXT PRIMARY KEY,
 *   feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
 *   title TEXT,
 *   link TEXT,
 *   description TEXT,
 *   pub_date TIMESTAMPTZ,
 *   guid TEXT UNIQUE,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * -- Indexes
 * CREATE INDEX IF NOT EXISTS idx_items_feed_id ON items(feed_id);
 * CREATE INDEX IF NOT EXISTS idx_items_pub_date ON items(pub_date DESC);
 * CREATE INDEX IF NOT EXISTS idx_feeds_slug ON feeds(slug);
 *
 * -- Enable RLS (Row Level Security) - allow all for now
 * ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE items ENABLE ROW LEVEL SECURITY;
 *
 * -- Policies to allow all operations (single-user app)
 * CREATE POLICY "Allow all on feeds" ON feeds FOR ALL USING (true) WITH CHECK (true);
 * CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
 */
