/**
 * Auto-detection Service
 * Automatically detects content patterns in HTML pages
 */

import * as cheerio from 'cheerio';
import type { FeedSelectors, ExtractedItem } from '../types/feed.js';

// Common patterns for article/item containers
const ITEM_PATTERNS = [
  // Standard semantic patterns
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
  // Hacker News specific
  'tr.athing',
  '.athing',
  // Table-based layouts
  'tr:has(a[href])',
  // List items with links
  'li:has(a[href])',
  // Generic divs with structure
  'div:has(> a > h1,h2,h3,h4,h5,h6)',
  'div:has(> h1 > a,h2 > a,h3 > a)',
  'div:has(a[href]):has(h1,h2,h3,h4,h5,h6)',
];

// Common patterns for titles within items
const TITLE_PATTERNS = [
  // Hacker News specific
  '.titleline a',
  '.titleline',
  '.storylink',
  // Standard heading patterns
  'h1 a',
  'h2 a',
  'h3 a',
  'h4 a',
  'h1',
  'h2',
  'h3',
  'h4',
  // Class-based patterns
  '.title a',
  '.title',
  '.headline a',
  '.headline',
  'a.title',
  '[class*="title"] a',
  '[class*="title"]',
  // Fallback - first significant link
  'td a[href^="http"]',
  'a[href^="http"]',
];

// Common patterns for links
const LINK_PATTERNS = [
  '.titleline a',
  '.storylink',
  'h1 a',
  'h2 a',
  'h3 a',
  'h4 a',
  '.title a',
  '.headline a',
  'a.title',
  'td a[href^="http"]',
  'a[href^="http"]',
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
    try {
      const items = $(itemSelector);
      if (items.length < 2) continue; // Need at least 2 items to be considered a list

      // For each item pattern, try to find title and link patterns
      for (const titleSelector of TITLE_PATTERNS) {
        try {
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
              try {
                const linkEl = firstItem.find(lp);
                link = linkEl.attr('href') || '';
                if (link) {
                  linkSelector = lp;
                  break;
                }
              } catch {
                continue;
              }
            }
          }

          if (!link) continue;

          // Count how many items have both title and link
          let validItems = 0;
          items.slice(0, 30).each((_, el) => {
            try {
              const $el = $(el);
              const t = $el.find(titleSelector).text().trim();
              const l = $el.find(linkSelector).attr('href') || $el.find(titleSelector).attr('href') || '';
              if (t && l) validItems++;
            } catch {
              // Skip invalid items
            }
          });

          if (validItems < 2) continue;

          // Calculate confidence score
          const confidence = Math.min(validItems / Math.min(items.length, 30), 1) * 100;

          if (!bestResult || validItems > bestResult.itemCount ||
              (validItems === bestResult.itemCount && confidence > bestResult.confidence)) {

            // Try to find description and date selectors
            let descriptionSelector: string | undefined;
            let dateSelector: string | undefined;

            for (const dp of DESCRIPTION_PATTERNS) {
              try {
                const descEl = firstItem.find(dp);
                if (descEl.length > 0 && descEl.text().trim().length > 10) {
                  descriptionSelector = dp;
                  break;
                }
              } catch {
                continue;
              }
            }

            for (const datep of DATE_PATTERNS) {
              try {
                const dateEl = firstItem.find(datep);
                if (dateEl.length > 0) {
                  dateSelector = datep;
                  break;
                }
              } catch {
                continue;
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
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback: if no pattern matched, try to find any repeated link structure
  if (!bestResult) {
    bestResult = fallbackLinkDetection($, baseUrl);
  }

  return bestResult;
}

/**
 * Fallback detection - find any repeated structure with external links
 */
function fallbackLinkDetection($: cheerio.CheerioAPI, baseUrl: string): DetectionResult | null {
  // Look for links that point to external URLs
  const externalLinks = $('a[href^="http"]').filter((_, el) => {
    const href = $(el).attr('href') || '';
    try {
      const linkUrl = new URL(href);
      const base = new URL(baseUrl);
      return linkUrl.hostname !== base.hostname;
    } catch {
      return false;
    }
  });

  if (externalLinks.length < 3) return null;

  // Find common parent patterns
  const parentTags = new Map<string, number>();
  externalLinks.slice(0, 20).each((_, el) => {
    const parent = $(el).parent();
    const grandparent = parent.parent();

    // Build a selector based on parent structure
    const parentTag = parent.prop('tagName')?.toLowerCase() || '';
    const parentClass = parent.attr('class')?.split(' ')[0] || '';
    const gpTag = grandparent.prop('tagName')?.toLowerCase() || '';
    const gpClass = grandparent.attr('class')?.split(' ')[0] || '';

    if (gpTag && gpClass) {
      const selector = `${gpTag}.${gpClass}`;
      parentTags.set(selector, (parentTags.get(selector) || 0) + 1);
    } else if (gpTag) {
      parentTags.set(gpTag, (parentTags.get(gpTag) || 0) + 1);
    }
  });

  // Find most common parent pattern
  let bestSelector = '';
  let bestCount = 0;
  parentTags.forEach((count, selector) => {
    if (count > bestCount && count >= 3) {
      bestCount = count;
      bestSelector = selector;
    }
  });

  if (!bestSelector || bestCount < 3) return null;

  return {
    selectors: {
      item: bestSelector,
      title: 'a[href^="http"]',
      link: 'a[href^="http"]',
    },
    confidence: (bestCount / externalLinks.length) * 100,
    itemCount: bestCount,
  };
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
