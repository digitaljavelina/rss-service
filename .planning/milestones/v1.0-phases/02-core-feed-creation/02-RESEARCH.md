# Phase 2: Core Feed Creation - Research

**Researched:** 2026-02-16
**Domain:** Web scraping, CSS selector extraction, RSS/Atom feed generation
**Confidence:** HIGH

## Summary

This phase implements the core value proposition: users enter a URL, specify CSS selectors to extract content, preview results, and save a feed configuration that generates valid RSS 2.0/Atom XML. The project already has the `feed` library (v5.2.0) installed and working for feed output, so the main work is content extraction and the creation workflow UI.

Research confirms that Cheerio (v1.2.0) is the appropriate tool for static HTML parsing with CSS selectors, and the project's "Cheerio-first" strategy is correct for serverless. Puppeteer on Vercel is possible but problematic (250MB bundle limit, slow cold starts, timeouts), so Phase 2 should focus on Cheerio-only extraction and defer JS-rendered pages to Phase 4 (Advanced Extraction).

**Primary recommendation:** Build a Cheerio-based extraction pipeline with native `fetch`, chrono-node for date parsing, and an Alpine.js-powered preview UI. Generate GUIDs from content hashes rather than URLs to ensure stability.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cheerio | ^1.2.0 | HTML parsing & CSS selector extraction | Industry standard for Node.js scraping, jQuery-like API, fast |
| feed | ^5.2.0 | RSS 2.0/Atom XML generation | Already installed, TypeScript-native, battle-tested |
| chrono-node | ^2.x | Natural language date parsing | Handles "5 hours ago", "Jan 12", "2024-01-15" automatically |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.1.6 | Generate unique IDs | Already installed, for feed/item identifiers |
| slugify | ^1.6.6 | URL-safe slugs | Already installed, for feed URLs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chrono-node | dayjs/date-fns | chrono-node handles natural language; dayjs only parses formats |
| Native fetch | node-fetch/axios | Native fetch stable in Node 21+, experimental in 18-20; using native is cleaner |
| Cheerio | JSDOM | JSDOM is heavier, slower; Cheerio is sufficient for extraction |

**Installation:**
```bash
npm install chrono-node
```

Note: `cheerio` is NOT currently installed. Need to add:
```bash
npm install cheerio
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── page-fetcher.ts      # Fetch HTML from URLs (native fetch)
│   ├── content-extractor.ts  # Cheerio-based CSS selector extraction
│   ├── date-parser.ts        # chrono-node wrapper for date normalization
│   ├── feed-builder.ts       # Existing - generates RSS/Atom XML
│   └── feed-cache.ts         # Existing - in-memory caching
├── routes/
│   ├── api/
│   │   ├── preview.ts        # POST /api/preview - extract & return preview data
│   │   ├── feeds.ts          # CRUD operations for feed configs
│   │   └── refresh.ts        # POST /api/feeds/:id/refresh - manual refresh
│   ├── feeds.ts              # Existing - serve feed XML
│   └── ui.ts                 # Existing - serve HTML pages
└── types/
    └── feed.ts               # Type definitions for feed config, items
```

### Pattern 1: Extraction Service
**What:** Centralized Cheerio-based content extraction with configurable selectors
**When to use:** Every time content needs to be extracted from HTML
**Example:**
```typescript
// Source: cheerio.js.org/docs/advanced/extract/
import * as cheerio from 'cheerio';

interface ExtractionConfig {
  itemSelector: string;      // e.g., "article.post"
  titleSelector: string;     // e.g., "h2.title" (relative to item)
  linkSelector: string;      // e.g., "a.read-more" or "h2.title a"
  descriptionSelector?: string;
  dateSelector?: string;
}

interface ExtractedItem {
  title: string;
  link: string;
  description?: string;
  dateText?: string;
  pubDate?: Date;
}

function extractItems(html: string, baseUrl: string, config: ExtractionConfig): ExtractedItem[] {
  const $ = cheerio.load(html);
  const items: ExtractedItem[] = [];

  $(config.itemSelector).each((_, element) => {
    const $item = $(element);

    // Extract link - try href attribute, then find nested link
    let link = $item.find(config.linkSelector).attr('href') ||
               $item.find('a').first().attr('href') || '';

    // Convert relative URLs to absolute
    if (link && !link.startsWith('http')) {
      link = new URL(link, baseUrl).href;
    }

    const title = $item.find(config.titleSelector).text().trim();
    const description = config.descriptionSelector
      ? $item.find(config.descriptionSelector).text().trim()
      : undefined;
    const dateText = config.dateSelector
      ? $item.find(config.dateSelector).text().trim()
      : undefined;

    if (title || link) {
      items.push({ title, link, description, dateText });
    }
  });

  return items;
}
```

### Pattern 2: GUID Generation Strategy
**What:** Generate stable, unique GUIDs from content hashes rather than URLs
**When to use:** When creating feed items
**Example:**
```typescript
// Source: RSS best practices - theorangeone.net/posts/rss-guids/
import { createHash } from 'crypto';

function generateGuid(feedId: string, item: { title: string; link: string }): string {
  // Use content-based hash for stability
  // If title changes, it's considered a new item (intentional)
  // If URL changes but content same, same item
  const content = `${feedId}:${item.title}:${item.link}`;
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}
```

### Pattern 3: Date Parsing with Fallback
**What:** Parse diverse date formats with chrono-node, fallback to current date
**When to use:** Processing extracted date text
**Example:**
```typescript
// Source: github.com/wanasit/chrono
import * as chrono from 'chrono-node';

function parseDate(dateText: string | undefined, referenceDate?: Date): Date {
  if (!dateText) return new Date();

  // chrono handles: "5 hours ago", "Jan 12, 2024", "2024-01-15", etc.
  const parsed = chrono.parseDate(dateText, referenceDate || new Date());

  // Fallback to current date if parsing fails
  return parsed || new Date();
}
```

### Pattern 4: Preview API Response
**What:** Standard response format for preview endpoint
**When to use:** API design for preview functionality
**Example:**
```typescript
interface PreviewRequest {
  url: string;
  selectors: {
    item: string;
    title: string;
    link: string;
    description?: string;
    date?: string;
  };
}

interface PreviewResponse {
  success: boolean;
  items: Array<{
    title: string;
    link: string;
    description?: string;
    pubDate?: string;  // ISO 8601 format
  }>;
  metadata: {
    pageTitle: string;
    itemCount: number;
    fetchedAt: string;
  };
  errors?: string[];
}
```

### Anti-Patterns to Avoid
- **Building URLs manually:** Use `new URL(path, base).href` for URL resolution, not string concatenation
- **Storing relative URLs:** Always convert to absolute before storing in database
- **Using item URL as GUID:** URLs change; use content-based hashes instead
- **Skipping error handling on fetch:** External sites fail; always wrap in try/catch
- **Ignoring character encoding:** Cheerio handles this, but ensure UTF-8 in responses

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing | Custom regex for dates | chrono-node | Handles "5 hours ago", "Jan 2024", many locales |
| HTML parsing | Regex to extract content | Cheerio | Handles malformed HTML, proper DOM traversal |
| RSS generation | Template strings for XML | feed library | XML escaping, spec compliance, Atom support |
| URL resolution | String concatenation | `new URL()` constructor | Handles all edge cases (protocol-relative, etc.) |
| Unique IDs | Custom ID generators | nanoid | Cryptographically secure, URL-safe |
| XML validation | Custom validators | W3C Feed Validator (external) | Authoritative validation |

**Key insight:** Web scraping and feed generation have many edge cases (malformed HTML, diverse date formats, XML escaping). Libraries have solved these over years. Custom solutions will miss edge cases and create maintenance burden.

## Common Pitfalls

### Pitfall 1: Relative URL Handling
**What goes wrong:** Extracted links like `/article/123` stored as-is, break when served
**Why it happens:** Easy to miss that URLs need base resolution
**How to avoid:** Always resolve URLs immediately after extraction using `new URL(href, baseUrl).href`
**Warning signs:** Links in feed start with `/` or don't include domain

### Pitfall 2: Dynamic Content Not Loading
**What goes wrong:** Cheerio returns empty results for pages with JS-rendered content
**Why it happens:** Cheerio only parses static HTML; JS doesn't execute
**How to avoid:** For Phase 2, document this limitation clearly in UI. Defer to Phase 4 for Puppeteer/headless solution
**Warning signs:** Preview returns zero items from sites that clearly have content

### Pitfall 3: Selector Fragility
**What goes wrong:** Selectors that work today break when site updates HTML
**Why it happens:** Targeting overly specific classes that change (`.css-abc123`)
**How to avoid:** Prefer semantic selectors (`article`, `h2`, `time`) over generated class names. Document expected structure.
**Warning signs:** Selectors contain random-looking strings like `.css-` or `.sc-`

### Pitfall 4: Date Parsing Failures
**What goes wrong:** All items have current date despite page showing dates
**Why it happens:** Date format not recognized by chrono-node, or selector wrong
**How to avoid:** Log raw date text in preview; show warning if dates couldn't be parsed
**Warning signs:** All items have identical `pubDate` close to current time

### Pitfall 5: Duplicate Items on Refresh
**What goes wrong:** Same content appears multiple times after refresh
**Why it happens:** GUID generation is unstable (includes timestamp, or URL changes)
**How to avoid:** Use content-based GUID (hash of title+link). Check for existing GUID before insert.
**Warning signs:** Item count keeps growing even when source page unchanged

### Pitfall 6: Memory Issues with Large Pages
**What goes wrong:** Serverless function times out or crashes on large pages
**Why it happens:** Loading entire DOM into memory, no limits
**How to avoid:** Limit items extracted (e.g., first 50). Stream response if possible.
**Warning signs:** Specific URLs consistently fail while others work

### Pitfall 7: Bot Detection / Blocking
**What goes wrong:** Fetch returns 403 or CAPTCHA page
**Why it happens:** Site blocks requests without proper User-Agent or from known IP ranges
**How to avoid:** Set realistic User-Agent header. For Phase 2, just surface error clearly. Advanced handling in later phases.
**Warning signs:** 403/429 errors, HTML contains "captcha" or "blocked"

## Code Examples

Verified patterns from official sources:

### Fetching HTML with Error Handling
```typescript
// Using native fetch (Node.js 18+)
interface FetchResult {
  ok: boolean;
  html?: string;
  error?: string;
  statusCode?: number;
}

async function fetchPage(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSService/1.0; +https://rss-service-five.vercel.app/)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        statusCode: response.status
      };
    }

    const html = await response.text();
    return { ok: true, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
```

### Cheerio Extraction with the Extract Method
```typescript
// Source: cheerio.js.org/docs/advanced/extract/
import * as cheerio from 'cheerio';

const $ = cheerio.load(html);

// Extract multiple items at once
const data = $.extract({
  items: [{
    selector: 'article.post',
    value: {
      title: 'h2',
      link: { selector: 'a', value: 'href' },
      description: '.excerpt',
      date: { selector: 'time', value: 'datetime' }
    }
  }]
});

// Returns: { items: [{ title: '...', link: '...', ... }, ...] }
```

### Complete Preview Endpoint
```typescript
// POST /api/preview
import { Router } from 'express';
import * as cheerio from 'cheerio';
import * as chrono from 'chrono-node';

export const previewRouter = Router();

previewRouter.post('/preview', async (req, res) => {
  const { url, selectors } = req.body;

  // Validate input
  if (!url || !selectors?.item || !selectors?.title) {
    return res.status(400).json({
      success: false,
      errors: ['URL, item selector, and title selector are required']
    });
  }

  try {
    // Fetch page
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RSSService/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        errors: [`Failed to fetch: HTTP ${response.status}`]
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const items: any[] = [];
    const errors: string[] = [];

    $(selectors.item).slice(0, 20).each((_, element) => {
      const $item = $(element);

      const title = $item.find(selectors.title).text().trim();
      let link = $item.find(selectors.link || 'a').attr('href') || '';

      // Resolve relative URLs
      if (link && !link.startsWith('http')) {
        try {
          link = new URL(link, url).href;
        } catch {
          errors.push(`Invalid URL: ${link}`);
          link = '';
        }
      }

      const description = selectors.description
        ? $item.find(selectors.description).text().trim()
        : '';

      let pubDate: string | undefined;
      if (selectors.date) {
        const dateText = $item.find(selectors.date).text().trim() ||
                        $item.find(selectors.date).attr('datetime');
        if (dateText) {
          const parsed = chrono.parseDate(dateText);
          pubDate = parsed?.toISOString();
        }
      }

      if (title || link) {
        items.push({ title, link, description, pubDate });
      }
    });

    res.json({
      success: true,
      items,
      metadata: {
        pageTitle: $('title').text().trim(),
        itemCount: items.length,
        fetchedAt: new Date().toISOString(),
      },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      errors: [error instanceof Error ? error.message : 'Extraction failed'],
    });
  }
});
```

### daisyUI Form Layout for Feed Creation
```html
<!-- Feed creation form with daisyUI components -->
<div class="card bg-base-200 max-w-2xl mx-auto">
  <div class="card-body">
    <h2 class="card-title">Create New Feed</h2>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Source URL</span>
      </label>
      <input
        type="url"
        class="input input-bordered validator"
        placeholder="https://example.com/blog"
        x-model="url"
        required
      />
      <div class="validator-hint">Enter the page URL containing the content list</div>
    </div>

    <div class="divider">CSS Selectors</div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Item Selector</span>
        <span class="label-text-alt text-info">Required</span>
      </label>
      <input
        type="text"
        class="input input-bordered font-mono"
        placeholder="article.post"
        x-model="selectors.item"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label"><span class="label-text">Title</span></label>
        <input type="text" class="input input-bordered font-mono"
               placeholder="h2" x-model="selectors.title" />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">Link</span></label>
        <input type="text" class="input input-bordered font-mono"
               placeholder="a" x-model="selectors.link" />
      </div>
    </div>

    <div class="card-actions justify-end mt-4">
      <button class="btn btn-outline" @click="preview()">Preview</button>
      <button class="btn btn-primary" @click="save()" :disabled="!previewDone">Save Feed</button>
    </div>
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| node-fetch required | Native fetch in Node.js | Node 18+ (2022) | One less dependency |
| Cheerio callback API | Cheerio with extract() method | cheerio 1.0 (2022) | Cleaner extraction |
| Puppeteer bundled | @sparticuz/chromium-min for serverless | 2023+ | 250MB limit workaround |
| Custom RSS templates | feed library with types | feed 4.0+ | Type safety, spec compliance |

**Deprecated/outdated:**
- **request/request-promise:** Deprecated, use native fetch or undici
- **node-fetch for new projects:** Native fetch preferred in Node 18+
- **Cheerio pre-1.0:** Use 1.x for modern features like extract()

## Serverless Constraints (Vercel)

### Critical Limitations
| Constraint | Impact | Mitigation |
|------------|--------|------------|
| 10s default timeout (60s max hobby) | Large pages may timeout | Set 10s fetch timeout, limit items |
| 250MB bundle size | Puppeteer doesn't fit | Cheerio-only for Phase 2 |
| No persistent processes | Can't run browser in background | Defer headless to external service |
| Cold starts | First request slower | Minimize dependencies |

### Recommended Configuration
```typescript
// vercel.json for API routes
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30  // Increase for preview endpoint
    }
  }
}
```

### Puppeteer Options (Phase 4, NOT Phase 2)
For future reference when implementing Phase 4:
1. **@sparticuz/chromium-min** - Minimal Chromium for serverless (~45MB)
2. **Browserless.io** - External browser-as-a-service API
3. **Vercel Edge Functions** - Not suitable (no Node.js APIs)

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal item limit for preview**
   - What we know: Too many items slow response, too few may miss content
   - What's unclear: Exact threshold for Vercel timeouts
   - Recommendation: Start with 20 items, make configurable

2. **User-Agent strategy for blocked sites**
   - What we know: Some sites block non-browser User-Agents
   - What's unclear: Which User-Agent string works best
   - Recommendation: Use realistic browser UA, document failures for users

3. **Storage of selector configuration**
   - What we know: Feeds table has `selectors TEXT` column
   - What's unclear: JSON structure not yet defined
   - Recommendation: Use JSON with `{item, title, link, description, date}` keys

## Sources

### Primary (HIGH confidence)
- [cheerio.js.org/docs/advanced/extract/](https://cheerio.js.org/docs/advanced/extract/) - Extract method API
- [github.com/jpmonette/feed](https://github.com/jpmonette/feed) - Feed library v5.2.0
- [github.com/wanasit/chrono](https://github.com/wanasit/chrono) - chrono-node v2
- [rssboard.org/rss-specification](https://www.rssboard.org/rss-specification) - RSS 2.0 spec
- [vercel.com/kb/guide/deploying-puppeteer](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel) - Vercel Puppeteer guide
- [daisyui.com/components/](https://daisyui.com/components/) - daisyUI component docs

### Secondary (MEDIUM confidence)
- WebSearch: Cheerio best practices, verified with official docs
- WebSearch: RSS GUID best practices, verified with rssboard.org
- WebSearch: Native fetch vs node-fetch comparisons

### Tertiary (LOW confidence)
- WebSearch: Bot detection mitigation strategies (needs validation per-site)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified in official docs, feed already installed
- Architecture: HIGH - Patterns from official Cheerio and Express documentation
- Pitfalls: MEDIUM - Based on common scraping issues, verified in multiple sources

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable domain)
