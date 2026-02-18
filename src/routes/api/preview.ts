/**
 * Preview API endpoint
 * POST /api/preview - Extract content from URL with auto-detection
 */

import { Router, Request, Response } from 'express';
import * as cheerio from 'cheerio';
import { fetchPage, likelyNeedsJavaScript } from '../../services/page-fetcher.js';
import { fetchPageWithBrowser } from '../../services/page-fetcher-browser.js';
import { autoExtractItems } from '../../services/auto-detector.js';
import { parseDate } from '../../services/date-parser.js';
import type { ExtractedItem } from '../../types/feed.js';

// Create preview router
export const previewRouter = Router();

interface PreviewRequest {
  url: string;
  // Selectors are now optional - auto-detect if not provided
  selectors?: {
    item?: string;
    title?: string;
    link?: string;
    description?: string;
    date?: string;
  };
  // Use headless browser for JS-heavy sites
  useHeadless?: boolean;
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
    autoDetected: boolean;
  };
  selectors?: {
    item: string;
    title: string;
    link?: string;
    description?: string;
    date?: string;
  };
  // Suggest using headless browser if page looks like an SPA
  suggestHeadless?: boolean;
  errors?: string[];
}

// POST / - Preview extraction with auto-detection
previewRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as PreviewRequest;
    const errors: string[] = [];

    // Validate request body - only URL is required now
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

    if (errors.length > 0) {
      res.status(400).json({ success: false, errors } as PreviewResponse);
      return;
    }

    // Use headless browser if requested
    const useHeadless = body.useHeadless === true;

    // Fetch page (static or headless)
    const result = useHeadless
      ? await fetchPageWithBrowser(body.url)
      : await fetchPage(body.url);

    if (!result.ok || !result.html) {
      res.status(400).json({
        success: false,
        errors: [`Failed to fetch: ${result.error || 'Unknown error'}`],
      } as PreviewResponse);
      return;
    }

    // Check if page likely needs JS rendering (only when not already using headless)
    const suggestHeadless = useHeadless ? false : likelyNeedsJavaScript(result.html);

    // Extract items with auto-detection
    const extraction = autoExtractItems(result.html, body.url, body.selectors);

    if (!extraction || extraction.items.length === 0) {
      res.status(200).json({
        success: true,
        items: [],
        metadata: {
          pageTitle: cheerio.load(result.html)('title').text().trim() || 'Untitled',
          itemCount: 0,
          fetchedAt: new Date().toISOString(),
          autoDetected: !body.selectors?.item,
        },
        suggestHeadless,
        errors: ['Could not detect any content items on this page. The page may not have a recognizable article list.'],
      } as PreviewResponse);
      return;
    }

    // Parse dates for each item
    const itemsWithDates: ExtractedItem[] = extraction.items.map((item) => ({
      ...item,
      pubDate: item.dateText ? parseDate(item.dateText) : undefined,
    }));

    // Get page title
    const $ = cheerio.load(result.html);
    const pageTitle = $('title').text().trim() || 'Untitled';

    // Return success response with detected selectors
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
        autoDetected: !body.selectors?.item,
      },
      selectors: extraction.selectors,
      suggestHeadless,
    } as PreviewResponse);
  } catch (error) {
    console.error('Preview extraction error:', error);
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
    } as PreviewResponse);
  }
});
