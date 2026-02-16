import { Router } from 'express';
import { createHash } from 'crypto';
import { buildFeed } from '../services/feed-builder.js';

// Create feeds router
export const feedsRouter = Router();

// Feed serving endpoint with content negotiation
feedsRouter.get('/:identifier', async (req, res) => {
  const { identifier } = req.params;

  // Determine format based on Accept header
  const acceptHeader = req.get('Accept') || '*/*';
  let format: 'rss2' | 'atom1' = 'rss2'; // Default to RSS 2.0
  let contentType = 'application/rss+xml; charset=utf-8';

  // Explicit Atom request takes precedence
  if (acceptHeader.includes('application/atom+xml')) {
    format = 'atom1';
    contentType = 'application/atom+xml; charset=utf-8';
  }
  // Explicit RSS request (or */* which is default)
  else {
    format = 'rss2';
    contentType = 'application/rss+xml; charset=utf-8';
  }

  try {
    // Build feed (now async)
    const xml = await buildFeed(identifier, format);
    if (!xml) {
      return res.status(404).json({ error: 'Feed not found' });
    }

    // Generate ETag from content hash
    const etag = createHash('md5').update(xml).digest('hex');

    // Set headers
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.set('ETag', `"${etag}"`);
    res.send(xml);
  } catch (error) {
    console.error('Error building feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
