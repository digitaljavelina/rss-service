/**
 * Preview API endpoint
 * POST /api/preview - Extract content from URL using selectors
 */

import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { fetchPage } from '../../services/page-fetcher.js';
import { extractItems } from '../../services/content-extractor.js';
import { parseDate } from '../../services/date-parser.js';
import type { FeedSelectors, ExtractedItem } from '../../types/feed.js';

// Create preview router
export const previewRouter = Router();

interface PreviewRequest {
  url: string;
  selectors: {
    item: string;
    title: string;
    link: string;
    description?: string;
    date?: string;
  };
}

interface PreviewResponse {
  success: boolean;
  items?: Array<{
    title: string;
    link: string;
    description?: string;
    pubDate?: string;
  }>;
  metadata?: {
    pageTitle: string;
    itemCount: number;
    fetchedAt: string;
  };
  errors?: string[];
}

// POST / - Preview extraction
previewRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as PreviewRequest;
    const errors: string[] = [];

    // Validate request body
    if (!body.url) {
      errors.push('url is required');
    } else {
      // Validate URL format
      try {
        new URL(body.url);
      } catch {
        errors.push('url must be a valid URL');
      }
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
      res.status(400).json({ success: false, errors } as PreviewResponse);
      return;
    }

    // Fetch page
    const result = await fetchPage(body.url);
    if (!result.ok || !result.html) {
      res.status(400).json({
        success: false,
        errors: [`Failed to fetch: ${result.error || 'Unknown error'}`],
      } as PreviewResponse);
      return;
    }

    // Extract items
    const selectors: FeedSelectors = {
      item: body.selectors.item,
      title: body.selectors.title,
      link: body.selectors.link,
      description: body.selectors.description,
      date: body.selectors.date,
    };

    const items = extractItems(result.html, body.url, selectors);

    // Parse dates for each item
    const itemsWithDates: ExtractedItem[] = items.map((item) => ({
      ...item,
      pubDate: item.dateText ? parseDate(item.dateText) : undefined,
    }));

    // Get page title
    const $ = cheerio.load(result.html);
    const pageTitle = $('title').text().trim() || 'Untitled';

    // Return success response
    res.status(200).json({
      success: true,
      items: itemsWithDates.map((i) => ({
        title: i.title,
        link: i.link,
        description: i.description,
        pubDate: i.pubDate?.toISOString(),
      })),
      metadata: {
        pageTitle,
        itemCount: itemsWithDates.length,
        fetchedAt: new Date().toISOString(),
      },
    } as PreviewResponse);
  } catch (error) {
    console.error('Preview extraction error:', error);
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
    } as PreviewResponse);
  }
});
