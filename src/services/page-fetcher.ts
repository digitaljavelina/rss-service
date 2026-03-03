/**
 * Page Fetcher Service
 * Fetches HTML content from URLs with proper timeout and headers
 */

import * as cheerio from 'cheerio';
import type { FetchResult } from '../types/feed.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ACCEPT_HEADER = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse Retry-After header value into milliseconds.
 * Supports both delay-seconds and HTTP-date formats.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (!isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * Fetch HTML content from a URL with retry + exponential backoff for 429s
 * @param url - The URL to fetch
 * @returns FetchResult with ok status and html content or error
 */
export async function fetchPage(url: string): Promise<FetchResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': ACCEPT_HEADER,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
        const delay = retryAfter ?? BASE_DELAY_MS * Math.pow(2, attempt);
        // Cap delay at 10 seconds
        await sleep(Math.min(delay, 10000));
        continue;
      }

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
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        ok: false,
        error: message,
      };
    }
  }

  return {
    ok: false,
    error: 'Max retries exceeded',
  };
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
