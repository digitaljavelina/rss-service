/**
 * Reddit RSS integration service
 *
 * Reddit provides built-in RSS feeds at .rss URLs for subreddits and users.
 * No API key or OAuth required — just fetch and parse the Atom/RSS XML.
 */

import * as cheerio from 'cheerio';
import type { ExtractedItem } from '../types/feed.js';

/** Parsed result from a Reddit URL */
export interface RedditUrlInfo {
  subreddit?: string;
  username?: string;
  sort?: string;
}

/**
 * Parse a Reddit URL to extract subreddit, username, and sort.
 */
export function parseRedditUrl(url: string): RedditUrlInfo | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.replace('www.', '').replace('old.', '').replace('new.', '');
  if (hostname !== 'reddit.com') {
    return null;
  }

  const path = parsed.pathname.replace(/\/$/, ''); // Strip trailing slash

  // /r/subreddit or /r/subreddit/sort
  const subredditMatch = path.match(/^\/r\/([\w]+)(?:\/(hot|new|top|rising))?/);
  if (subredditMatch) {
    return {
      subreddit: subredditMatch[1],
      sort: subredditMatch[2] || undefined,
    };
  }

  // /u/username or /user/username
  const userMatch = path.match(/^\/(?:u|user)\/([\w-]+)/);
  if (userMatch) {
    return {
      username: userMatch[1],
    };
  }

  return null;
}

/**
 * Check if a URL is a Reddit URL
 */
export function isRedditUrl(url: string): boolean {
  return parseRedditUrl(url) !== null;
}

/**
 * Build the RSS feed URL for a Reddit resource.
 */
export function buildRedditRssUrl(info: RedditUrlInfo): string {
  if (info.subreddit) {
    const sort = info.sort ? `/${info.sort}` : '';
    return `https://www.reddit.com/r/${info.subreddit}${sort}.rss`;
  }

  if (info.username) {
    return `https://www.reddit.com/user/${info.username}/submitted.rss`;
  }

  throw new Error('Reddit URL must contain a subreddit or username');
}

/**
 * Fetch RSS XML from Reddit with proper User-Agent header.
 */
export async function fetchRedditRss(rssUrl: string): Promise<string> {
  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'RSS-Service/1.0',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Reddit rate limit reached. Please wait a moment and try again.');
    }
    if (response.status === 404) {
      throw new Error('Subreddit or user not found. Check the URL and try again.');
    }
    throw new Error(`Reddit returned ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Parse Reddit Atom/RSS XML into ExtractedItem[].
 * Reddit returns Atom format with <entry> elements.
 */
export function parseRedditRss(xml: string, sourceUrl: string): ExtractedItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: ExtractedItem[] = [];

  // Reddit uses Atom format: <entry> elements
  $('entry').each((_i, el) => {
    const title = $(el).find('title').text().trim();
    const link = $(el).find('link[href]').attr('href') || '';
    const contentHtml = $(el).find('content').text().trim();
    const updated = $(el).find('updated').text().trim();

    if (!title) return;

    // Strip HTML tags from content for description
    const description = stripHtml(contentHtml);

    items.push({
      title,
      link,
      description: truncate(description, 500),
      pubDate: updated ? new Date(updated) : undefined,
    });
  });

  // Fallback: try RSS 2.0 format (<item> elements)
  if (items.length === 0) {
    $('item').each((_i, el) => {
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const descriptionHtml = $(el).find('description').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();

      if (!title) return;

      const description = stripHtml(descriptionHtml);

      items.push({
        title,
        link,
        description: truncate(description, 500),
        pubDate: pubDate ? new Date(pubDate) : undefined,
      });
    });
  }

  return items;
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  if (!html) return '';
  // Decode HTML entities and strip tags
  const $ = cheerio.load(`<div>${html}</div>`, { xmlMode: false });
  return $('div').text().trim();
}

/**
 * Truncate text to a maximum length.
 */
function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
