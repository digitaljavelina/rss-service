import { Feed } from 'feed';
import { supabase } from '../db/index.js';
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
export async function buildFeed(identifier: string, format: 'rss2' | 'atom1'): Promise<string | null> {
  // Check cache first
  const cacheKey = `${identifier}:${format}`;
  const cached = getCachedFeed(cacheKey);
  if (cached) {
    return cached;
  }

  // Query feed by slug OR id
  const { data: feedRow, error: feedError } = await supabase
    .from('feeds')
    .select('*')
    .or(`slug.eq.${identifier},id.eq.${identifier}`)
    .single();

  if (feedError || !feedRow) {
    return null;
  }

  const feed = feedRow as FeedRow;

  // Query items for this feed
  const { data: itemRows, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('feed_id', feed.id)
    .order('pub_date', { ascending: false })
    .limit(feed.item_limit);

  if (itemsError) {
    console.error('Error fetching items:', itemsError);
    return null;
  }

  const items = (itemRows || []) as ItemRow[];

  // Create Feed instance
  const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const feedInstance = new Feed({
    title: feed.name,
    id: feed.id,
    link: `${baseUrl}/feeds/${feed.slug}`,
    description: `RSS feed for ${feed.name}`,
    copyright: '',
    updated: new Date(feed.updated_at),
    feedLinks: {
      rss: `${baseUrl}/feeds/${feed.slug}`,
      atom: `${baseUrl}/feeds/${feed.slug}`,
    },
  });

  // Add items to feed
  for (const item of items) {
    feedInstance.addItem({
      title: item.title || 'Untitled',
      id: item.guid,
      link: item.link || '',
      description: item.description || '',
      date: item.pub_date ? new Date(item.pub_date) : new Date(),
    });
  }

  // Generate XML
  const xml = format === 'atom1' ? feedInstance.atom1() : feedInstance.rss2();

  // Cache the result
  setCachedFeed(cacheKey, xml);

  return xml;
}
