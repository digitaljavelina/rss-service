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
  // Whether headless browser was used for this extraction
  usedHeadless?: boolean;
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

    // First try static fetch
    const staticResult = await fetchPage(body.url);
    let usedHeadless = false;

    if (!staticResult.ok || !staticResult.html) {
      res.status(400).json({
        success: false,
        errors: [`Failed to fetch: ${staticResult.error || 'Unknown error'}`],
      } as PreviewResponse);
      return;
    }

    let html = staticResult.html;

    // Check if page likely needs JS rendering
    const needsHeadless = likelyNeedsJavaScript(html);

    // Try extraction with static HTML first
    let extraction = autoExtractItems(html, body.url, body.selectors);

    // If no items found and page likely needs JS, automatically retry with headless browser
    if ((!extraction || extraction.items.length === 0) && needsHeadless) {
      const headlessResult = await fetchPageWithBrowser(body.url);
      if (headlessResult.ok && headlessResult.html) {
        html = headlessResult.html;
        usedHeadless = true;
        extraction = autoExtractItems(html, body.url, body.selectors);
      }
    }

    if (!extraction || extraction.items.length === 0) {
      res.status(200).json({
        success: true,
        items: [],
        metadata: {
          pageTitle: cheerio.load(html)('title').text().trim() || 'Untitled',
          itemCount: 0,
          fetchedAt: new Date().toISOString(),
          autoDetected: !body.selectors?.item,
        },
        usedHeadless,
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
    const $ = cheerio.load(html);
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
      usedHeadless,
    } as PreviewResponse);
  } catch (error) {
    console.error('Preview extraction error:', error);
    res.status(500).json({
      success: false,
      errors: ['Internal server error'],
    } as PreviewResponse);
  }
});
