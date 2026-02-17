/**
 * Content Extractor Service
 * Extracts items from HTML using CSS selectors via Cheerio
 */

import * as cheerio from 'cheerio';
import type { FeedSelectors, ExtractedItem } from '../types/feed.js';

const MAX_ITEMS = 50;

/**
 * Extract items from HTML using CSS selectors
 * @param html - The HTML content to parse
 * @param baseUrl - Base URL for resolving relative links
 * @param selectors - CSS selectors for item, title, link, description, date
 * @returns Array of extracted items
 */
export function extractItems(
  html: string,
  baseUrl: string,
  selectors: FeedSelectors
): ExtractedItem[] {
  const $ = cheerio.load(html);
  const items: ExtractedItem[] = [];

  $(selectors.item).slice(0, MAX_ITEMS).each((_, element) => {
    const $el = $(element);

    // Extract title
    const titleEl = $el.find(selectors.title);
    const title = titleEl.text().trim();

    // Extract link
    const linkEl = $el.find(selectors.link);
    let link = linkEl.attr('href') || '';

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
      if (descText) {
        description = descText;
      }
    }

    // Extract optional date text
    let dateText: string | undefined;
    if (selectors.date) {
      const dateEl = $el.find(selectors.date);
      const dateStr = dateEl.text().trim();
      if (dateStr) {
        dateText = dateStr;
      }
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
