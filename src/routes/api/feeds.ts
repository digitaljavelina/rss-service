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
import { autoExtractItems } from '../../services/auto-detector.js';
import { parseDate } from '../../services/date-parser.js';
import { invalidateFeed } from '../../services/feed-cache.js';
import { buildFeed } from '../../services/feed-builder.js';
import type { FeedSelectors, ExtractedItem } from '../../types/feed.js';

// Create feeds API router
export const feedsApiRouter = Router();

interface CreateFeedRequest {
  name: string;
  url: string;
  selectors?: Partial<FeedSelectors>; // Now optional - auto-detect if not provided
}

interface FeedRow {
  id: string;
  slug: string;
  name: string;
  url: string | null;
  selectors: string;
  item_limit: number;
  created_at: string;
  updated_at: string;
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

    // Fetch page first to auto-detect selectors if needed
    const fetchResult = await fetchPage(body.url);
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

    // Insert feed into database with detected selectors
    const { error: insertError } = await supabase.from('feeds').insert({
      id: feedId,
      slug: slug,
      name: body.name,
      url: body.url,
      selectors: JSON.stringify(extraction.selectors),
      item_limit: 100,
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
    // Query all feeds
    const { data: feeds, error } = await supabase
      .from('feeds')
      .select('id, slug, name, url, created_at, updated_at')
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
          createdAt: feed.created_at,
          updatedAt: feed.updated_at,
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
    res.status(200).json({
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
    });
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
    let selectors: Partial<FeedSelectors> | undefined;
    try {
      selectors = JSON.parse(feedRow.selectors);
    } catch {
      // No selectors stored, will auto-detect
    }

    // Fetch page
    const fetchResult = await fetchPage(feedRow.url || '');
    if (!fetchResult.ok || !fetchResult.html) {
      res.status(400).json({
        error: `Failed to fetch source: ${fetchResult.error}`,
      });
      return;
    }

    // Extract items with auto-detection
    const extraction = autoExtractItems(fetchResult.html, feedRow.url || '', selectors);
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
