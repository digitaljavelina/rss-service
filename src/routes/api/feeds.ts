/**
 * Feed CRUD API endpoints
 * POST /api/feeds - Create new feed
 * GET /api/feeds - List all feeds
 * GET /api/feeds/:id - Get single feed by ID or slug
 */

import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import slugifyModule from 'slugify';
const slugify = slugifyModule.default || slugifyModule;
import { createHash } from 'crypto';
import { supabase } from '../../db/index.js';
import { fetchPage } from '../../services/page-fetcher.js';
import { extractItems } from '../../services/content-extractor.js';
import { parseDate } from '../../services/date-parser.js';
import type { FeedSelectors, ExtractedItem } from '../../types/feed.js';

// Create feeds API router
export const feedsApiRouter = Router();

interface CreateFeedRequest {
  name: string;
  url: string;
  selectors: FeedSelectors;
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

// POST / - Create new feed
feedsApiRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateFeedRequest;
    const errors: string[] = [];

    // Validate required fields
    if (!body.name) {
      errors.push('name is required');
    }
    if (!body.url) {
      errors.push('url is required');
    }
    if (!body.selectors) {
      errors.push('selectors is required');
    } else {
      if (!body.selectors.item) {
        errors.push('selectors.item is required');
      }
      if (!body.selectors.title) {
        errors.push('selectors.title is required');
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, errors });
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

    // Insert feed into database
    const { error: insertError } = await supabase.from('feeds').insert({
      id: feedId,
      slug: slug,
      name: body.name,
      url: body.url,
      selectors: JSON.stringify(body.selectors),
      item_limit: 100,
    });

    if (insertError) {
      console.error('Error inserting feed:', insertError);
      res.status(500).json({ success: false, errors: ['Failed to create feed'] });
      return;
    }

    // Fetch page and extract items
    const fetchResult = await fetchPage(body.url);
    let itemCount = 0;

    if (fetchResult.ok && fetchResult.html) {
      const items = extractItems(fetchResult.html, body.url, body.selectors);

      // Parse dates and prepare items for insertion
      const itemsWithDates: ExtractedItem[] = items.map((item) => ({
        ...item,
        pubDate: item.dateText ? parseDate(item.dateText) : undefined,
      }));

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
