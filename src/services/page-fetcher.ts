/**
 * Page Fetcher Service
 * Fetches HTML content from URLs with proper timeout and headers
 */

import * as cheerio from 'cheerio';
import type { FetchResult } from '../types/feed.js';

const USER_AGENT = 'Mozilla/5.0 (compatible; RSSService/1.0)';
const ACCEPT_HEADER = 'text/html,application/xhtml+xml';
const TIMEOUT_MS = 10000;

/**
 * Fetch HTML content from a URL
 * @param url - The URL to fetch
 * @returns FetchResult with ok status and html content or error
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': ACCEPT_HEADER,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    const html = await response.text();
    return {
      ok: true,
      html,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      ok: false,
      error: message,
    };
  }
}

/**
 * Detect if a page likely needs JavaScript rendering
 * Uses heuristics to identify SPA shells and JS-heavy pages
 * @param html - The raw HTML content to analyze
 * @returns true if the page likely needs headless browser rendering
 */
export function likelyNeedsJavaScript(html: string): boolean {
  const $ = cheerio.load(html);

  // Remove script, style, noscript before measuring text content
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  // Heuristic 1: Body text is very short (likely empty SPA shell)
  if (bodyText.length < 200) {
    return true;
  }

  // Reload HTML to count script tags (they were removed above)
  const $full = cheerio.load(html);
  const scriptCount = $full('script[src]').length;

  // Heuristic 2: Many script tags with little visible text
  if (scriptCount > 5 && bodyText.length < 500) {
    return true;
  }

  // Heuristic 3: Common SPA root selectors with minimal content
  const spaRoots = ['#root', '#app', '[data-reactroot]', '#__nuxt', '#__next'];
  for (const selector of spaRoots) {
    const el = $full(selector);
    if (el.length > 0 && el.text().trim().length < 50) {
      return true;
    }
  }

  return false;
}
