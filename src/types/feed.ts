/**
 * Feed type definitions for RSS Service
 * Used by extraction services and feed creation workflow
 */

/**
 * CSS selectors for extracting content from a webpage
 */
export interface FeedSelectors {
  item: string;
  title: string;
  link: string;
  description?: string;
  date?: string;
}

/**
 * Configuration for a feed source
 */
export interface FeedConfig {
  url: string;
  selectors: FeedSelectors;
}

/**
 * An item extracted from a webpage
 */
export interface ExtractedItem {
  title: string;
  link: string;
  description?: string;
  dateText?: string;
  pubDate?: Date;
}

/**
 * Result of fetching a page
 */
export interface FetchResult {
  ok: boolean;
  html?: string;
  error?: string;
  statusCode?: number;
}
