import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

// Max feeds to process per cron run (stay within 60s timeout)
const MAX_FEEDS_PER_RUN = 5;

/**
 * Initialize Supabase client.
 * Done inline to avoid shared state between serverless invocations.
 */
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }
  return createClient(url, key);
}

interface FeedRow {
  id: string;
  slug: string;
  name: string;
  url: string | null;
  selectors: string;
  item_limit: number;
  refresh_interval_minutes: number | null;
  next_refresh_at: string | null;
  refresh_status: 'idle' | 'refreshing' | 'error';
  last_refresh_error: string | null;
  feed_type: 'web' | 'youtube' | 'reddit';
  platform_config: Record<string, unknown>;
}

interface FeedSelectors {
  item?: string;
  title?: string;
  link?: string;
  description?: string;
  date?: string;
  useHeadless?: boolean;
}

interface ExtractedItem {
  title: string;
  link: string;
  description?: string;
  dateText?: string;
  pubDate?: Date;
}

/**
 * Generate a content-based GUID for deduplication
 */
function generateGuid(feedId: string, title: string, link: string): string {
  return createHash('sha256')
    .update(`${feedId}:${title}:${link}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Extract items based on feed type: web scraping, YouTube API, or Reddit RSS.
 */
async function extractItems(feed: FeedRow): Promise<ExtractedItem[]> {
  const feedType = feed.feed_type || 'web';

  if (feedType === 'youtube') {
    // YouTube: fetch via Data API v3
    const { getYouTubeApiKey, fetchPlaylistItems } = await import('../../src/services/youtube.js');
    const apiKey = await getYouTubeApiKey();
    if (!apiKey) throw new Error('YouTube API key not configured');

    const platformConfig = feed.platform_config as { playlistId?: string };
    if (!platformConfig?.playlistId) throw new Error('YouTube feed missing playlistId in platform_config');

    return await fetchPlaylistItems(apiKey, platformConfig.playlistId);
  }

  if (feedType === 'reddit') {
    // Reddit: fetch built-in RSS feed
    const { fetchRedditRss, parseRedditRss } = await import('../../src/services/reddit.js');
    const platformConfig = feed.platform_config as { feedUrl?: string };
    const rssUrl = platformConfig?.feedUrl || feed.url;
    if (!rssUrl) throw new Error('Reddit feed missing feedUrl');

    const rssXml = await fetchRedditRss(rssUrl);
    return parseRedditRss(rssXml);
  }

  // Web: existing flow — fetch page, auto-detect, extract
  const { fetchPage } = await import('../../src/services/page-fetcher.js');
  const { fetchPageWithBrowser } = await import('../../src/services/page-fetcher-browser.js');
  const { autoExtractItems } = await import('../../src/services/auto-detector.js');

  let selectors: FeedSelectors | undefined;
  try {
    selectors = JSON.parse(feed.selectors);
  } catch {
    // No selectors - will auto-detect
  }

  const useHeadless = selectors?.useHeadless === true;
  const feedUrl = feed.url || '';

  const fetchResult = useHeadless
    ? await fetchPageWithBrowser(feedUrl)
    : await fetchPage(feedUrl);

  if (!fetchResult.ok || !fetchResult.html) {
    throw new Error(`Failed to fetch ${feedUrl}: ${fetchResult.error || 'Unknown error'}`);
  }

  const extractionSelectors: Partial<FeedSelectors> | undefined = selectors
    ? { item: selectors.item, title: selectors.title, link: selectors.link, description: selectors.description, date: selectors.date }
    : undefined;

  const extraction = autoExtractItems(fetchResult.html, feedUrl, extractionSelectors);
  if (!extraction) throw new Error('Could not extract content from page');

  return extraction.items;
}

/**
 * Refresh a single feed: extract items (by type), upsert new items,
 * enforce item limit, and update scheduling timestamps.
 */
async function refreshFeed(feed: FeedRow): Promise<{ newItems: number }> {
  const supabase = getSupabase();
  const { parseDate } = await import('../../src/services/date-parser.js');

  // Extract items using platform-specific logic
  const items = await extractItems(feed);

  // Get existing GUIDs to avoid duplicates
  const { data: existingItems } = await supabase
    .from('items')
    .select('guid')
    .eq('feed_id', feed.id);

  const existingGuids = new Set<string>(existingItems?.map((i: { guid: string }) => i.guid) ?? []);

  // Prepare new items only
  const newItemRows: Array<{
    id: string;
    feed_id: string;
    title: string;
    link: string;
    description: string | null;
    pub_date: string;
    guid: string;
  }> = [];

  for (const item of items) {
    const guid = generateGuid(feed.id, item.title, item.link);
    if (existingGuids.has(guid)) continue;

    const pubDate = item.dateText ? parseDate(item.dateText) : (item.pubDate ?? undefined);
    newItemRows.push({
      id: nanoid(),
      feed_id: feed.id,
      title: item.title,
      link: item.link,
      description: item.description ?? null,
      pub_date: pubDate instanceof Date ? pubDate.toISOString() : (pubDate || new Date().toISOString()),
      guid,
    });
  }

  // Insert new items
  if (newItemRows.length > 0) {
    await supabase.from('items').insert(newItemRows);
  }

  // Enforce item limit - delete oldest items if over limit
  const { count } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('feed_id', feed.id);

  if (count && count > feed.item_limit) {
    const toDelete = count - feed.item_limit;
    const { data: oldItems } = await supabase
      .from('items')
      .select('id')
      .eq('feed_id', feed.id)
      .order('pub_date', { ascending: true })
      .limit(toDelete);

    if (oldItems && oldItems.length > 0) {
      await supabase
        .from('items')
        .delete()
        .in('id', oldItems.map((i: { id: string }) => i.id));
    }
  }

  return { newItems: newItemRows.length };
}

/**
 * Vercel cron handler.
 *
 * Vercel automatically sends:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Security: We verify this header to reject unauthorized requests.
 * Schedule: Configured in vercel.json as "0 0 * * *" (daily at midnight UTC).
 * Note: Vercel Hobby plan limits cron to once/day. Self-hosted deployments
 * can trigger this endpoint at any frequency (e.g., every minute via node-cron).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET (Vercel cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Vercel cron authorization
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  try {
    // Query feeds that are due for refresh and not currently refreshing
    // Limit to MAX_FEEDS_PER_RUN to stay within 60s function timeout
    const { data: dueFeeds, error: queryError } = await supabase
      .from('feeds')
      .select('*')
      .lte('next_refresh_at', now)
      .eq('refresh_status', 'idle')
      .not('refresh_interval_minutes', 'is', null)
      .order('next_refresh_at', { ascending: true })
      .limit(MAX_FEEDS_PER_RUN);

    if (queryError) {
      console.error('Scheduler: failed to query feeds', queryError);
      return res.status(500).json({ error: 'Failed to query feeds' });
    }

    const feeds = (dueFeeds ?? []) as FeedRow[];

    if (feeds.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No feeds due for refresh' });
    }

    // Mark all selected feeds as 'refreshing' to prevent concurrent processing
    const feedIds = feeds.map((f) => f.id);
    const { error: markError } = await supabase
      .from('feeds')
      .update({ refresh_status: 'refreshing' })
      .in('id', feedIds);

    if (markError) {
      console.error('Scheduler: failed to mark feeds as refreshing', markError);
      return res.status(500).json({ error: 'Failed to mark feeds as refreshing' });
    }

    // Process feeds in parallel
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const startTime = Date.now();
        try {
          const { newItems } = await refreshFeed(feed);

          // Calculate next refresh time based on interval
          const nextRefreshAt = new Date(
            Date.now() + (feed.refresh_interval_minutes ?? 60) * 60 * 1000
          ).toISOString();

          // Update feed: success state
          await supabase
            .from('feeds')
            .update({
              refresh_status: 'idle',
              next_refresh_at: nextRefreshAt,
              last_refresh_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', feed.id);

          return {
            feedId: feed.id,
            slug: feed.slug,
            newItems,
            durationMs: Date.now() - startTime,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Scheduler: failed to refresh feed ${feed.slug}:`, errorMessage);

          // Calculate next refresh even on failure (to avoid tight retry loops)
          const nextRefreshAt = new Date(
            Date.now() + (feed.refresh_interval_minutes ?? 60) * 60 * 1000
          ).toISOString();

          // Update feed: error state
          await supabase
            .from('feeds')
            .update({
              refresh_status: 'error',
              next_refresh_at: nextRefreshAt,
              last_refresh_error: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', feed.id);

          return {
            feedId: feed.id,
            slug: feed.slug,
            error: errorMessage,
            durationMs: Date.now() - startTime,
          };
        }
      })
    );

    // Summarize results
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    const details = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: String((r as PromiseRejectedResult).reason) }
    );

    console.log(`Scheduler: processed ${feeds.length} feeds - ${succeeded} ok, ${failed} failed`);

    return res.status(200).json({
      processed: feeds.length,
      succeeded,
      failed,
      details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('Scheduler: unexpected error', error);
    return res.status(500).json({ error: message });
  }
}
