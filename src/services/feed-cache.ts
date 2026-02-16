// In-memory feed cache with TTL
const feedCache = new Map<string, { xml: string; expires: number }>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get cached feed XML if not expired
 * @param cacheKey - Cache key (format: "identifier:format")
 * @returns Cached XML or null if expired/not found
 */
export function getCachedFeed(cacheKey: string): string | null {
  const cached = feedCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expires) {
    feedCache.delete(cacheKey);
    return null;
  }

  return cached.xml;
}

/**
 * Store feed XML in cache with expiry
 * @param cacheKey - Cache key (format: "identifier:format")
 * @param xml - RSS/Atom XML string
 */
export function setCachedFeed(cacheKey: string, xml: string): void {
  feedCache.set(cacheKey, {
    xml,
    expires: Date.now() + CACHE_TTL,
  });
}

/**
 * Invalidate all cache entries for a feed (both RSS and Atom formats)
 * @param feedId - Feed identifier (slug or ID)
 */
export function invalidateFeed(feedId: string): void {
  feedCache.delete(`${feedId}:rss2`);
  feedCache.delete(`${feedId}:atom1`);
}
