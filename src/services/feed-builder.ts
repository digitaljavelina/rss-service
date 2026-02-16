import { Feed } from 'feed';
import { db } from '../db/index.js';
import { getCachedFeed, setCachedFeed } from './feed-cache.js';

interface FeedRow {
  id: string;
  slug: string;
  name: string;
  url: string | null;
  item_limit: number;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  feed_id: string;
  title: string | null;
  link: string | null;
  description: string | null;
  pub_date: string | null;
  guid: string;
}

/**
 * Build RSS or Atom feed XML
 * @param identifier - Feed slug or ID
 * @param format - 'rss2' or 'atom1'
 * @returns XML string or null if feed not found
 */
export function buildFeed(identifier: string, format: 'rss2' | 'atom1'): string | null {
  // Check cache first
  const cacheKey = `${identifier}:${format}`;
  const cached = getCachedFeed(cacheKey);
  if (cached) {
    return cached;
  }

  // Query feed by slug OR id
  const feedRow = db.prepare<[string, string], FeedRow>(
    'SELECT * FROM feeds WHERE slug = ? OR id = ?'
  ).get(identifier, identifier);

  if (!feedRow) {
    return null;
  }

  // Query items for this feed
  const itemRows = db.prepare<[string, number], ItemRow>(
    'SELECT * FROM items WHERE feed_id = ? ORDER BY pub_date DESC LIMIT ?'
  ).all(feedRow.id, feedRow.item_limit);

  // Create Feed instance
  const feed = new Feed({
    title: feedRow.name,
    id: feedRow.id,
    link: `http://localhost:3000/feeds/${feedRow.slug}`,
    description: `RSS feed for ${feedRow.name}`,
    copyright: '',
    updated: new Date(feedRow.updated_at),
    feedLinks: {
      rss: `http://localhost:3000/feeds/${feedRow.slug}`,
      atom: `http://localhost:3000/feeds/${feedRow.slug}`,
    },
  });

  // Add items to feed
  for (const item of itemRows) {
    feed.addItem({
      title: item.title || 'Untitled',
      id: item.guid,
      link: item.link || '',
      description: item.description || '',
      date: item.pub_date ? new Date(item.pub_date) : new Date(),
    });
  }

  // Generate XML
  const xml = format === 'atom1' ? feed.atom1() : feed.rss2();

  // Cache the result
  setCachedFeed(cacheKey, xml);

  return xml;
}
