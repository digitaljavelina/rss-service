/**
 * Page Fetcher Service
 * Fetches HTML content from URLs with proper timeout and headers
 */

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
