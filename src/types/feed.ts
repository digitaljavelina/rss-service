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

/**
 * Database row for the feeds table
 * Includes all columns: core fields + scheduling fields added in Phase 5
 */
export interface FeedRow {
  id: string;
  slug: string;
  name: string;
  url: string | null;
  selectors: string;
  created_at: string;
  updated_at: string;
  item_limit: number;
  // Scheduling fields (Phase 5)
  refresh_interval_minutes: number | null;
  next_refresh_at: string | null;
  refresh_status: 'idle' | 'refreshing' | 'error';
  last_refresh_error: string | null;
}

/**
 * Available refresh interval options for auto-scheduling
 * NULL minutes means manual refresh only
 */
export const REFRESH_INTERVALS = [
  { label: 'Manual only', minutes: null },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: 'Daily', minutes: 1440 },
] as const;
