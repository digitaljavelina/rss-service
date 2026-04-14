/**
 * Feed Scheduler Service
 *
 * In-process node-cron that checks every minute for feeds due to refresh.
 */

import cron from 'node-cron';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import pino from 'pino';
import { supabase } from '../db/index.js';
import { fetchPage } from './page-fetcher.js';
import { fetchPageWithBrowser } from './page-fetcher-browser.js';
import { autoExtractItems } from './auto-detector.js';
import { parseDate } from './date-parser.js';
import { getYouTubeApiKey, fetchPlaylistItems } from './youtube.js';
import { fetchRedditRss, parseRedditRss } from './reddit.js';
import type { FeedRow, FeedSelectors, ExtractedItem } from '../types/feed.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Max feeds to process per scheduler tick (prevents long-running cycles)
const MAX_FEEDS_PER_RUN = 10;

// Cron expression: every minute (scheduler checks if any feeds are due)
const CRON_EXPRESSION = '* * * * *';

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
 * Extract items from a feed based on its type (web, youtube, reddit)
 */
async function extractItems(feed: FeedRow): Promise<ExtractedItem[]> {
  const feedType = feed.feed_type || 'web';

  if (feedType === 'youtube') {
    const apiKey = await getYouTubeApiKey();
    if (!apiKey) throw new Error('YouTube API key not configured');

    const platformConfig = feed.platform_config as { playlistId?: string };
    if (!platformConfig?.playlistId) {
      throw new Error('YouTube feed missing playlistId in platform_config');
    }

    return await fetchPlaylistItems(apiKey, platformConfig.playlistId);
  }

  if (feedType === 'reddit') {
    const platformConfig = feed.platform_config as { feedUrl?: string };
    const rssUrl = platformConfig?.feedUrl || feed.url;
    if (!rssUrl) throw new Error('Reddit feed missing feedUrl');

    const rssXml = await fetchRedditRss(rssUrl);
    return parseRedditRss(rssXml, rssUrl);
  }

  // Web: fetch page, auto-detect, extract
  let selectors: Partial<FeedSelectors> & { useHeadless?: boolean } | undefined;
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

  const extractionSelectors = selectors
    ? { item: selectors.item, title: selectors.title, link: selectors.link, description: selectors.description, date: selectors.date }
    : undefined;

  const extraction = autoExtractItems(fetchResult.html, feedUrl, extractionSelectors);
  if (!extraction) throw new Error('Could not extract content from page');

  return extraction.items;
}

/**
 * Refresh a single feed: extract items, upsert new items, enforce item limit
 */
async function refreshFeed(feed: FeedRow): Promise<{ newItems: number }> {
  const items = await extractItems(feed);

  // Get existing GUIDs to avoid duplicates
  const { data: existingItems } = await supabase
    .from('items')
    .select('guid')
    .eq('feed_id', feed.id);

  const existingGuids = new Set<string>(
    (existingItems as Array<{ guid: string }> | null)?.map((i) => i.guid) ?? []
  );

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

  // Insert new items (ON CONFLICT DO NOTHING handles any race-condition duplicates)
  if (newItemRows.length > 0) {
    const { error: insertError } = await supabase
      .from('items')
      .insert(newItemRows, { onConflict: 'guid' } as any);

    if (insertError) {
      logger.warn({ err: insertError, feedId: feed.id }, 'Scheduler: item insert had errors');
    }
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
        .in('id', (oldItems as Array<{ id: string }>).map((i) => i.id));
    }
  }

  return { newItems: newItemRows.length };
}

/**
 * Query and refresh all feeds that are due.
 * Returns summary of processed feeds.
 */
export async function refreshDueFeeds(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  details: Array<{ feedId: string; slug: string; newItems?: number; error?: string; durationMs: number }>;
}> {
  const now = new Date().toISOString();

  // Query feeds that are due for refresh and not currently refreshing
  const { data: dueFeeds, error: queryError } = await supabase
    .from('feeds')
    .select('*')
    .lte('next_refresh_at', now)
    .eq('refresh_status', 'idle')
    .not('refresh_interval_minutes', 'is', null)
    .order('next_refresh_at', { ascending: true })
    .limit(MAX_FEEDS_PER_RUN);

  if (queryError) {
    logger.error({ err: queryError }, 'Scheduler: failed to query feeds');
    throw new Error('Failed to query feeds');
  }

  const feeds = (dueFeeds ?? []) as FeedRow[];

  if (feeds.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, details: [] };
  }

  // Mark all selected feeds as 'refreshing' to prevent concurrent processing
  const feedIds = feeds.map((f) => f.id);
  const { error: markError } = await supabase
    .from('feeds')
    .update({ refresh_status: 'refreshing' })
    .in('id', feedIds);

  if (markError) {
    logger.error({ err: markError }, 'Scheduler: failed to mark feeds as refreshing');
    throw new Error('Failed to mark feeds as refreshing');
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
        logger.error({ feedSlug: feed.slug, err: error }, 'Scheduler: failed to refresh feed');

        // Calculate next refresh even on failure (to avoid tight retry loops)
        const nextRefreshAt = new Date(
          Date.now() + (feed.refresh_interval_minutes ?? 60) * 60 * 1000
        ).toISOString();

        // Update feed: return to idle so it's retried next tick; error is
        // surfaced via last_refresh_error.
        await supabase
          .from('feeds')
          .update({
            refresh_status: 'idle',
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
  const details = results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { feedId: '', slug: '', error: String((r as PromiseRejectedResult).reason), durationMs: 0 }
  );

  const succeeded = details.filter((d) => !d.error).length;
  const failed = details.filter((d) => d.error).length;

  if (feeds.length > 0) {
    logger.info({ processed: feeds.length, succeeded, failed }, 'Scheduler: tick complete');
  }

  return { processed: feeds.length, succeeded, failed, details };
}

/**
 * Reset feeds stuck in 'refreshing' status back to 'idle'.
 * This handles the case where the app crashed mid-refresh.
 */
async function recoverStaleFeeds(): Promise<void> {
  try {
    const { error } = await supabase
      .from('feeds')
      .update({ refresh_status: 'idle', last_refresh_error: 'Recovered from stale refreshing state (app restart)' })
      .eq('refresh_status', 'refreshing');

    if (error) {
      logger.error({ err: error }, 'Scheduler: failed to recover stale feeds');
    } else {
      logger.info('Scheduler: recovered any feeds stuck in refreshing state');
    }
  } catch (err) {
    logger.error({ err }, 'Scheduler: stale feed recovery failed');
  }
}

/**
 * Start the in-process cron scheduler.
 * Returns the ScheduledTask so it can be stopped on shutdown.
 */
export function startScheduler(): { stop: () => void } {
  logger.info({ cron: CRON_EXPRESSION }, 'Scheduler: starting in-process cron');

  // Recover feeds stuck in 'refreshing' from a previous crash
  recoverStaleFeeds();

  const task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await refreshDueFeeds();
    } catch (error) {
      logger.error({ err: error }, 'Scheduler: tick failed');
    }
  });

  return task;
}
