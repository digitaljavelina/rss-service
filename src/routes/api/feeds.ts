/**
 * Feed CRUD API endpoints
 * POST /api/feeds - Create new feed
 * GET /api/feeds - List all feeds
 * GET /api/feeds/:id - Get single feed by ID or slug
 * POST /api/feeds/:id/refresh - Manual refresh of feed
 * GET /api/feeds/:id/export - Download feed as XML file
 */

import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import slugifyModule from 'slugify';
const slugify = slugifyModule.default || slugifyModule;
import { createHash } from 'crypto';
import { supabase } from '../../db/index.js';
import { fetchPage } from '../../services/page-fetcher.js';
import { fetchPageWithBrowser } from '../../services/page-fetcher-browser.js';
import { autoExtractItems } from '../../services/auto-detector.js';
import { parseDate } from '../../services/date-parser.js';
import { invalidateFeed } from '../../services/feed-cache.js';
import { buildFeed } from '../../services/feed-builder.js';
import type { FeedSelectors, ExtractedItem, FeedRow } from '../../types/feed.js';

// Create feeds API router
export const feedsApiRouter = Router();

interface CreateFeedRequest {
  name: string;
  url: string;
  selectors?: Partial<FeedSelectors>; // Now optional - auto-detect if not provided
  useHeadless?: boolean; // Use headless browser for JS-heavy sites
  refresh_interval_minutes?: number | null; // Auto-refresh interval in minutes; null = manual only
  items?: Array<{
    title: string;
    link: string;
    description?: string | null;
    pubDate?: string | null;
  }>;
}

/**
 * Calculate next_refresh_at from an interval in minutes.
 * Returns ISO string or null if interval is null/undefined.
 */
function calculateNextRefreshAt(intervalMinutes: number | null | undefined): string | null {
  if (intervalMinutes == null || intervalMinutes <= 0) return null;
  const next = new Date(Date.now() + intervalMinutes * 60 * 1000);
  return next.toISOString();
}

/**
 * Generate content-based GUID for an item
 */
function generateGuid(feedId: string, item: ExtractedItem): string {
  return createHash('sha256')
    .update(`${feedId}:${item.title}:${item.link}`)
    .digest('hex')
    .substring(0, 16);
}

// POST / - Create new feed with auto-detection
feedsApiRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateFeedRequest;
    const errors: string[] = [];

    // Validate required fields - only name and url now
    if (!body.name) {
      errors.push('name is required');
    }
    if (!body.url) {
      errors.push('url is required');
    } else {
      try {
        new URL(body.url);
      } catch {
        errors.push('url must be a valid URL');
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, errors });
      return;
    }

    // Use headless browser if requested
    const useHeadless = body.useHeadless === true;

    // Fetch page first to auto-detect selectors if needed
    const fetchResult = useHeadless
      ? await fetchPageWithBrowser(body.url)
      : await fetchPage(body.url);

    if (!fetchResult.ok || !fetchResult.html) {
      res.status(400).json({
        success: false,
        errors: [`Failed to fetch URL: ${fetchResult.error || 'Unknown error'}`],
      });
      return;
    }

    // Extract items with auto-detection
    const extraction = autoExtractItems(fetchResult.html, body.url, body.selectors);

    if (!extraction || extraction.items.length === 0) {
      res.status(400).json({
        success: false,
        errors: ['Could not detect any content items on this page. The page may not have a recognizable article list.'],
      });
      return;
    }

    // Generate feed ID
    const feedId = nanoid();

    // Generate slug from name
    let slug = slugify(body.name, { lower: true, strict: true });

    // Check if slug already exists
    const { data: existingFeed } = await supabase
      .from('feeds')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (existingFeed) {
      // Append short random suffix to make unique
      slug = `${slug}-${nanoid(6)}`;
    }

    // Insert feed into database with detected selectors (include useHeadless flag)
    const selectorsWithHeadless = useHeadless
      ? { ...extraction.selectors, useHeadless: true }
      : extraction.selectors;

    // Determine refresh interval and next refresh time
    const refreshIntervalMinutes = body.refresh_interval_minutes != null
      ? Number(body.refresh_interval_minutes)
      : null;
    const nextRefreshAt = calculateNextRefreshAt(refreshIntervalMinutes);

    const { error: insertError } = await supabase.from('feeds').insert({
      id: feedId,
      slug: slug,
      name: body.name,
      url: body.url,
      selectors: JSON.stringify(selectorsWithHeadless),
      item_limit: 100,
      refresh_interval_minutes: refreshIntervalMinutes,
      next_refresh_at: nextRefreshAt,
    });

    if (insertError) {
      console.error('Error inserting feed:', insertError);
      res.status(500).json({ success: false, errors: ['Failed to create feed'] });
      return;
    }

    // Parse dates and prepare items for insertion
    const itemsWithDates: ExtractedItem[] = extraction.items.map((item) => ({
      ...item,
      pubDate: item.dateText ? parseDate(item.dateText) : undefined,
    }));

    let itemCount = 0;
    if (itemsWithDates.length > 0) {
      // Insert items into database
      const { error: itemsError } = await supabase.from('items').insert(
        itemsWithDates.map((item) => ({
          id: nanoid(),
          feed_id: feedId,
          title: item.title,
          link: item.link,
          description: item.description || null,
          pub_date: item.pubDate?.toISOString() || new Date().toISOString(),
          guid: generateGuid(feedId, item),
        }))
      );

      if (itemsError) {
        console.error('Error inserting items:', itemsError);
        // Feed created but items failed - continue and report
      } else {
        itemCount = itemsWithDates.length;
      }
    }

    // If imported items provided, insert any that weren't already scraped (dedup by GUID)
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      const { data: existingItems } = await supabase
        .from('items')
        .select('guid')
        .eq('feed_id', feedId);

      const existingGuids = new Set(existingItems?.map((i) => i.guid) || []);

      const importedItems = body.items
        .filter((item) => item.title && item.link)
        .map((item) => {
          const guid = createHash('sha256')
            .update(`${feedId}:${item.title}:${item.link}`)
            .digest('hex')
            .substring(0, 16);
          return { ...item, guid };
        })
        .filter((item) => !existingGuids.has(item.guid));

      if (importedItems.length > 0) {
        await supabase.from('items').insert(
          importedItems.map((item) => ({
            id: nanoid(),
            feed_id: feedId,
            title: item.title,
            link: item.link,
            description: item.description || null,
            pub_date: item.pubDate || new Date().toISOString(),
            guid: item.guid,
          }))
        );
        itemCount += importedItems.length;
      }
    }

    // Return success response
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    res.status(201).json({
      id: feedId,
      slug: slug,
      name: body.name,
      feedUrl: `${baseUrl}/feeds/${slug}`,
      itemCount,
    });
  } catch (error) {
    console.error('Create feed error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// GET / - List all feeds
feedsApiRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Query all feeds including scheduling fields
    const { data: feeds, error } = await supabase
      .from('feeds')
      .select('id, slug, name, url, created_at, updated_at, refresh_interval_minutes, next_refresh_at, refresh_status, last_refresh_error')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feeds:', error);
      res.status(500).json({ success: false, errors: ['Failed to fetch feeds'] });
      return;
    }

    // Get item counts for each feed
    const feedsWithCounts = await Promise.all(
      (feeds || []).map(async (feed) => {
        const { count } = await supabase
          .from('items')
          .select('*', { count: 'exact', head: true })
          .eq('feed_id', feed.id);

        return {
          id: feed.id,
          slug: feed.slug,
          name: feed.name,
          url: feed.url,
          itemCount: count || 0,
          updated_at: feed.updated_at,
          createdAt: feed.created_at,
          updatedAt: feed.updated_at,
          refresh_interval_minutes: feed.refresh_interval_minutes ?? null,
          next_refresh_at: feed.next_refresh_at ?? null,
          refresh_status: (feed.refresh_status as string) || 'idle',
          last_refresh_error: feed.last_refresh_error ?? null,
        };
      })
    );

    res.status(200).json(feedsWithCounts);
  } catch (error) {
    console.error('List feeds error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// GET /:id - Get single feed by ID or slug
feedsApiRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Query feed by id or slug
    const { data: feed, error } = await supabase
      .from('feeds')
      .select('*')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (error || !feed) {
      res.status(404).json({ success: false, errors: ['Feed not found'] });
      return;
    }

    const feedRow = feed as FeedRow;

    // Get item count
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('feed_id', feedRow.id);

    // Parse selectors from JSON string
    let selectors: FeedSelectors | null = null;
    try {
      selectors = JSON.parse(feedRow.selectors);
    } catch {
      // Invalid JSON, leave as null
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const result: Record<string, unknown> = {
      id: feedRow.id,
      slug: feedRow.slug,
      name: feedRow.name,
      url: feedRow.url,
      selectors,
      itemLimit: feedRow.item_limit,
      itemCount: count || 0,
      feedUrl: `${baseUrl}/feeds/${feedRow.slug}`,
      createdAt: feedRow.created_at,
      updatedAt: feedRow.updated_at,
      refreshIntervalMinutes: feedRow.refresh_interval_minutes ?? null,
      nextRefreshAt: feedRow.next_refresh_at ?? null,
      refreshStatus: feedRow.refresh_status || 'idle',
    };

    // Include items if requested (for full export)
    if (req.query.include === 'items') {
      const { data: items } = await supabase
        .from('items')
        .select('title, link, description, pub_date')
        .eq('feed_id', feedRow.id)
        .order('pub_date', { ascending: false });

      result.items = (items || []).map((item) => ({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pub_date,
      }));
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// POST /:id/refresh - Manual refresh of feed
feedsApiRouter.post('/:id/refresh', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Find feed by id or slug
    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('*')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (feedError || !feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    const feedRow = feed as FeedRow;

    // Parse selectors from JSON (may be empty for auto-detect)
    let selectors: Partial<FeedSelectors> & { useHeadless?: boolean } | undefined;
    try {
      selectors = JSON.parse(feedRow.selectors);
    } catch {
      // No selectors stored, will auto-detect
    }

    // Check if feed was created with headless browser
    const useHeadless = selectors?.useHeadless === true;

    // Fetch page (use headless if feed was created with it)
    const fetchResult = useHeadless
      ? await fetchPageWithBrowser(feedRow.url || '')
      : await fetchPage(feedRow.url || '');

    if (!fetchResult.ok || !fetchResult.html) {
      res.status(400).json({
        error: `Failed to fetch source: ${fetchResult.error}`,
      });
      return;
    }

    // Remove useHeadless from selectors before passing to extraction (it's not a CSS selector)
    const extractionSelectors = selectors
      ? { item: selectors.item, title: selectors.title, link: selectors.link, description: selectors.description, date: selectors.date }
      : undefined;

    // Extract items with auto-detection
    const extraction = autoExtractItems(fetchResult.html, feedRow.url || '', extractionSelectors);
    if (!extraction) {
      res.status(400).json({ error: 'Could not extract content from page' });
      return;
    }

    const extractedItems = extraction.items;

    // Get existing GUIDs to avoid duplicates
    const { data: existingItems } = await supabase
      .from('items')
      .select('guid')
      .eq('feed_id', feedRow.id);

    const existingGuids = new Set(existingItems?.map((i) => i.guid) || []);

    // Filter to new items only and prepare for insert
    const newItems: Array<{
      id: string;
      feed_id: string;
      title: string;
      link: string;
      description: string | null;
      pub_date: string;
      guid: string;
    }> = [];

    for (const item of extractedItems) {
      const guid = createHash('sha256')
        .update(`${feedRow.id}:${item.title}:${item.link}`)
        .digest('hex')
        .substring(0, 16);

      if (!existingGuids.has(guid)) {
        const pubDate = item.dateText ? parseDate(item.dateText) : undefined;
        newItems.push({
          id: nanoid(),
          feed_id: feedRow.id,
          title: item.title,
          link: item.link,
          description: item.description || null,
          pub_date: pubDate?.toISOString() || new Date().toISOString(),
          guid: guid,
        });
      }
    }

    // Insert new items
    if (newItems.length > 0) {
      await supabase.from('items').insert(newItems);
    }

    // Enforce item limit - delete oldest items if over limit
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('feed_id', feedRow.id);

    if (count && count > feedRow.item_limit) {
      const toDelete = count - feedRow.item_limit;
      const { data: oldItems } = await supabase
        .from('items')
        .select('id')
        .eq('feed_id', feedRow.id)
        .order('pub_date', { ascending: true })
        .limit(toDelete);

      if (oldItems && oldItems.length > 0) {
        await supabase
          .from('items')
          .delete()
          .in(
            'id',
            oldItems.map((i) => i.id)
          );
      }
    }

    // Update feed's updated_at timestamp
    await supabase
      .from('feeds')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', feedRow.id);

    // Invalidate cache using existing function
    invalidateFeed(feedRow.slug);
    invalidateFeed(feedRow.id);

    res.json({
      success: true,
      newItems: newItems.length,
      totalItems: count ? Math.min(count + newItems.length, feedRow.item_limit) : newItems.length,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Refresh failed',
    });
  }
});

// PUT /:id - Update feed name, url, item limit, and/or refresh interval
feedsApiRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const body = req.body as { name?: string; url?: string; itemLimit?: number; refresh_interval_minutes?: number | null };
    const errors: string[] = [];

    // Validate name
    if (!body.name) {
      errors.push('name is required');
    } else if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 100) {
      errors.push('name must be between 1 and 100 characters');
    }

    // Validate url if provided
    if (body.url !== undefined) {
      if (!body.url) {
        errors.push('url cannot be empty');
      } else {
        try {
          new URL(body.url);
        } catch {
          errors.push('url must be a valid URL');
        }
      }
    }

    // Validate itemLimit if provided
    if (body.itemLimit !== undefined) {
      const limit = Number(body.itemLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
        errors.push('itemLimit must be a whole number between 1 and 1000');
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, errors });
      return;
    }

    // Find feed by id or slug
    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('*')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (feedError || !feed) {
      res.status(404).json({ success: false, errors: ['Feed not found'] });
      return;
    }

    const feedRow = feed as FeedRow;
    const name = body.name!.trim();
    const itemLimit = body.itemLimit !== undefined ? Number(body.itemLimit) : feedRow.item_limit;
    const newUrl = body.url !== undefined ? body.url.trim() : feedRow.url;
    const urlChanged = newUrl !== feedRow.url;

    // Determine new refresh interval
    // If the key is present in body, use it (allows explicit null for manual-only)
    // Otherwise preserve existing value from DB
    const hasIntervalInBody = Object.prototype.hasOwnProperty.call(body, 'refresh_interval_minutes');
    const newRefreshIntervalMinutes = hasIntervalInBody
      ? (body.refresh_interval_minutes != null ? Number(body.refresh_interval_minutes) : null)
      : feedRow.refresh_interval_minutes;
    const newNextRefreshAt = calculateNextRefreshAt(newRefreshIntervalMinutes);

    // Parse existing selectors to check for useHeadless flag
    let existingSelectors: Partial<FeedSelectors> & { useHeadless?: boolean } | undefined;
    try {
      existingSelectors = JSON.parse(feedRow.selectors);
    } catch {
      // No selectors stored
    }
    const useHeadless = existingSelectors?.useHeadless === true;

    let updateData: Record<string, unknown> = {
      name,
      item_limit: itemLimit,
      refresh_interval_minutes: newRefreshIntervalMinutes,
      next_refresh_at: newNextRefreshAt,
      updated_at: new Date().toISOString(),
    };

    if (urlChanged && newUrl) {
      // Fetch new URL and re-detect selectors (use headless if feed was created with it)
      const fetchResult = useHeadless
        ? await fetchPageWithBrowser(newUrl)
        : await fetchPage(newUrl);

      if (!fetchResult.ok || !fetchResult.html) {
        res.status(400).json({
          success: false,
          errors: [`Failed to fetch new URL: ${fetchResult.error || 'Unknown error'}`],
        });
        return;
      }

      const extraction = autoExtractItems(fetchResult.html, newUrl);
      if (!extraction || extraction.items.length === 0) {
        res.status(400).json({
          success: false,
          errors: ['Could not detect any content items on the new URL. The page may not have a recognizable article list.'],
        });
        return;
      }

      // Update URL, selectors (preserve useHeadless flag)
      const newSelectors = useHeadless
        ? { ...extraction.selectors, useHeadless: true }
        : extraction.selectors;

      updateData = {
        ...updateData,
        url: newUrl,
        selectors: JSON.stringify(newSelectors),
      };

      // Delete existing items and re-fetch with new selectors
      await supabase.from('items').delete().eq('feed_id', feedRow.id);

      // Insert fresh items
      const itemsWithDates: ExtractedItem[] = extraction.items.map((item) => ({
        ...item,
        pubDate: item.dateText ? parseDate(item.dateText) : undefined,
      }));

      if (itemsWithDates.length > 0) {
        await supabase.from('items').insert(
          itemsWithDates.map((item) => ({
            id: nanoid(),
            feed_id: feedRow.id,
            title: item.title,
            link: item.link,
            description: item.description || null,
            pub_date: item.pubDate?.toISOString() || new Date().toISOString(),
            guid: generateGuid(feedRow.id, item),
          }))
        );
      }
    } else {
      updateData.url = feedRow.url;
    }

    // Apply update
    const { data: updatedFeed, error: updateError } = await supabase
      .from('feeds')
      .update(updateData)
      .eq('id', feedRow.id)
      .select()
      .single();

    if (updateError || !updatedFeed) {
      console.error('Error updating feed:', updateError);
      res.status(500).json({ success: false, errors: ['Failed to update feed'] });
      return;
    }

    // Invalidate cache
    invalidateFeed(feedRow.slug);
    invalidateFeed(feedRow.id);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const updated = updatedFeed as FeedRow;
    res.status(200).json({
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      url: updated.url,
      itemLimit: updated.item_limit,
      feedUrl: `${baseUrl}/feeds/${updated.slug}`,
      updatedAt: updated.updated_at,
      urlChanged,
      refreshIntervalMinutes: updated.refresh_interval_minutes ?? null,
      nextRefreshAt: updated.next_refresh_at ?? null,
    });
  } catch (error) {
    console.error('Update feed error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// DELETE /:id - Delete a feed and its items
feedsApiRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Find feed by id or slug
    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('id, slug')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (feedError || !feed) {
      res.status(404).json({ success: false, errors: ['Feed not found'] });
      return;
    }

    const feedRow = feed as Pick<FeedRow, 'id' | 'slug'>;

    // Delete feed (items cascade automatically via foreign key constraint)
    const { error: deleteError } = await supabase
      .from('feeds')
      .delete()
      .eq('id', feedRow.id);

    if (deleteError) {
      console.error('Error deleting feed:', deleteError);
      res.status(500).json({ success: false, errors: ['Failed to delete feed'] });
      return;
    }

    // Invalidate cache entries for this feed
    invalidateFeed(feedRow.slug);
    invalidateFeed(feedRow.id);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete feed error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// GET /:id/export - Download feed as XML file
feedsApiRouter.get('/:id/export', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const formatParam = typeof req.query.format === 'string' ? req.query.format : '';
  const format: 'rss2' | 'atom1' = formatParam === 'atom' ? 'atom1' : 'rss2';

  try {
    // Find feed to get the name for filename
    const { data: feed, error: feedError } = await supabase
      .from('feeds')
      .select('name, slug')
      .or(`id.eq.${id},slug.eq.${id}`)
      .single();

    if (feedError || !feed) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Build the feed XML
    const xml = await buildFeed(id, format);
    if (!xml) {
      res.status(404).json({ error: 'Feed not found' });
      return;
    }

    // Generate filename
    const extension = format === 'atom1' ? 'atom.xml' : 'rss.xml';
    const filename = `${feed.slug}-${extension}`;

    // Set headers for file download
    res.setHeader(
      'Content-Type',
      format === 'atom1' ? 'application/atom+xml; charset=utf-8' : 'application/rss+xml; charset=utf-8'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Export failed',
    });
  }
});
