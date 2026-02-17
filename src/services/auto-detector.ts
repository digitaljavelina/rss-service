/**
 * Auto-detection Service
 * Automatically detects content patterns in HTML pages
 */

import * as cheerio from 'cheerio';
import type { FeedSelectors, ExtractedItem } from '../types/feed.js';

// Common patterns for article/item containers
const ITEM_PATTERNS = [
  'article',
  '[role="article"]',
  '.post',
  '.article',
  '.entry',
  '.item',
  '.story',
  '.card',
  '.news-item',
  '.blog-post',
  '.feed-item',
  '.list-item',
  'li:has(a):has(h1,h2,h3,h4,h5,h6)',
  'div:has(> a > h1,h2,h3,h4,h5,h6)',
  'div:has(> h1 > a,h2 > a,h3 > a)',
];

// Common patterns for titles within items
const TITLE_PATTERNS = [
  'h1 a',
  'h2 a',
  'h3 a',
  'h4 a',
  'h1',
  'h2',
  'h3',
  'h4',
  '.title a',
  '.title',
  '.headline a',
  '.headline',
  'a.title',
  '[class*="title"] a',
  '[class*="title"]',
];

// Common patterns for links
const LINK_PATTERNS = [
  'h1 a',
  'h2 a',
  'h3 a',
  'h4 a',
  '.title a',
  '.headline a',
  'a.title',
  'a:first-of-type',
  'a[href]',
];

// Common patterns for descriptions
const DESCRIPTION_PATTERNS = [
  '.summary',
  '.excerpt',
  '.description',
  '.intro',
  '.preview',
  '.snippet',
  'p:first-of-type',
  '[class*="summary"]',
  '[class*="excerpt"]',
  '[class*="description"]',
];

// Common patterns for dates
const DATE_PATTERNS = [
  'time',
  'time[datetime]',
  '.date',
  '.time',
  '.timestamp',
  '.published',
  '.posted',
  '[class*="date"]',
  '[class*="time"]',
  '[datetime]',
];

interface DetectionResult {
  selectors: FeedSelectors;
  confidence: number;
  itemCount: number;
}

/**
 * Auto-detect content selectors from HTML
 */
export function autoDetectSelectors(html: string, baseUrl: string): DetectionResult | null {
  const $ = cheerio.load(html);

  // Try each item pattern and score based on how many items found
  let bestResult: DetectionResult | null = null;

  for (const itemSelector of ITEM_PATTERNS) {
    const items = $(itemSelector);
    if (items.length < 2) continue; // Need at least 2 items to be considered a list

    // For each item pattern, try to find title and link patterns
    for (const titleSelector of TITLE_PATTERNS) {
      const firstItem = items.first();
      const titleEl = firstItem.find(titleSelector);

      if (titleEl.length === 0) continue;

      const title = titleEl.text().trim();
      if (!title || title.length < 3) continue;

      // Find link - try title element first, then link patterns
      let linkSelector = titleSelector;
      let link = titleEl.attr('href') || titleEl.find('a').attr('href') || '';

      if (!link) {
        for (const lp of LINK_PATTERNS) {
          const linkEl = firstItem.find(lp);
          link = linkEl.attr('href') || '';
          if (link) {
            linkSelector = lp;
            break;
          }
        }
      }

      if (!link) continue;

      // Count how many items have both title and link
      let validItems = 0;
      items.slice(0, 20).each((_, el) => {
        const $el = $(el);
        const t = $el.find(titleSelector).text().trim();
        const l = $el.find(linkSelector).attr('href') || $el.find(titleSelector).attr('href') || '';
        if (t && l) validItems++;
      });

      if (validItems < 2) continue;

      // Calculate confidence score
      const confidence = Math.min(validItems / Math.min(items.length, 20), 1) * 100;

      if (!bestResult || validItems > bestResult.itemCount ||
          (validItems === bestResult.itemCount && confidence > bestResult.confidence)) {

        // Try to find description and date selectors
        let descriptionSelector: string | undefined;
        let dateSelector: string | undefined;

        for (const dp of DESCRIPTION_PATTERNS) {
          const descEl = firstItem.find(dp);
          if (descEl.length > 0 && descEl.text().trim().length > 10) {
            descriptionSelector = dp;
            break;
          }
        }

        for (const datep of DATE_PATTERNS) {
          const dateEl = firstItem.find(datep);
          if (dateEl.length > 0) {
            dateSelector = datep;
            break;
          }
        }

        bestResult = {
          selectors: {
            item: itemSelector,
            title: titleSelector,
            link: linkSelector,
            description: descriptionSelector,
            date: dateSelector,
          },
          confidence,
          itemCount: validItems,
        };
      }
    }
  }

  return bestResult;
}

/**
 * Extract items using auto-detected or provided selectors
 */
export function autoExtractItems(
  html: string,
  baseUrl: string,
  providedSelectors?: Partial<FeedSelectors>
): { items: ExtractedItem[]; selectors: FeedSelectors } | null {
  // If selectors provided, use them
  if (providedSelectors?.item && providedSelectors?.title) {
    const selectors: FeedSelectors = {
      item: providedSelectors.item,
      title: providedSelectors.title,
      link: providedSelectors.link || providedSelectors.title,
      description: providedSelectors.description,
      date: providedSelectors.date,
    };

    const items = extractWithSelectors(html, baseUrl, selectors);
    return { items, selectors };
  }

  // Auto-detect
  const detection = autoDetectSelectors(html, baseUrl);
  if (!detection) {
    return null;
  }

  const items = extractWithSelectors(html, baseUrl, detection.selectors);
  return { items, selectors: detection.selectors };
}

/**
 * Extract items with given selectors
 */
function extractWithSelectors(
  html: string,
  baseUrl: string,
  selectors: FeedSelectors
): ExtractedItem[] {
  const $ = cheerio.load(html);
  const items: ExtractedItem[] = [];
  const MAX_ITEMS = 50;

  $(selectors.item).slice(0, MAX_ITEMS).each((_, element) => {
    const $el = $(element);

    // Extract title
    const titleEl = $el.find(selectors.title);
    const title = titleEl.text().trim();

    // Extract link - try title element's href first, then link selector
    let link = titleEl.attr('href') || '';
    if (!link && selectors.link) {
      const linkEl = $el.find(selectors.link);
      link = linkEl.attr('href') || '';
    }

    // Convert relative URLs to absolute
    if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
      try {
        link = new URL(link, baseUrl).href;
      } catch {
        // Invalid URL, keep as-is
      }
    }

    // Skip items with no title AND no link
    if (!title && !link) {
      return;
    }

    // Extract optional description
    let description: string | undefined;
    if (selectors.description) {
      const descEl = $el.find(selectors.description);
      const descText = descEl.text().trim();
      if (descText && descText !== title) {
        description = descText.substring(0, 500); // Limit length
      }
    }

    // Extract optional date text
    let dateText: string | undefined;
    if (selectors.date) {
      const dateEl = $el.find(selectors.date);
      // Prefer datetime attribute over text
      dateText = dateEl.attr('datetime') || dateEl.text().trim();
    }

    items.push({
      title: title || 'Untitled',
      link,
      description,
      dateText,
    });
  });

  return items;
}
