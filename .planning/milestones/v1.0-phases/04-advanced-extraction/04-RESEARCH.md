# Phase 4: Advanced Extraction - Research

**Researched:** 2026-02-17
**Domain:** Headless browser integration (Chromium/Puppeteer), JS-need detection heuristics, selector adjustment UI
**Confidence:** HIGH (Vercel limits, @sparticuz/chromium API) / MEDIUM (JS-need detection heuristics, UI patterns)

---

<user_constraints>
## User Constraints (from phase context)

### Locked Decisions
- **CORE-07 (auto-detect): ALREADY COMPLETE** — shipped in Phase 2. `autoDetectSelectors()` and `autoExtractItems()` are the primary extraction path. No work needed.
- **CORE-08 (headless browser):** Use `@sparticuz/chromium` on Vercel. Opt-in for JS-heavy sites only. Cheerio remains primary for static HTML.
- **CORE-06 (visual selector):** Simplified picker approach — show auto-detect results with ability to adjust selections. NOT a full iframe proxy with hover highlighting. This is a fallback for when auto-detect gets it wrong.

### Claude's Discretion
- How to integrate @sparticuz/chromium with the existing extraction pipeline
- UI design for the simplified selector picker
- How to detect when a page needs JS rendering vs static extraction
- How the "adjust selections" UI should work

### Deferred Ideas (OUT OF SCOPE)
- Full iframe proxy with hover highlighting (too complex for a fallback feature)
- Playwright (using Chromium via @sparticuz/chromium instead)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-06 | User can visually select page elements to generate CSS selectors (click-to-select) | Simplified picker UI: show auto-detected selectors as editable text inputs; user can manually adjust; re-run preview with adjusted selectors. No iframe proxy needed. |
| CORE-07 | System auto-detects common content patterns (article lists, titles, dates) | **ALREADY COMPLETE** — `autoDetectSelectors()` and `autoExtractItems()` shipped in Phase 2. POST /api/preview already returns `selectors` in response. Zero work needed. |
| CORE-08 | System renders JavaScript-heavy pages via headless browser when needed | `@sparticuz/chromium` + `puppeteer-core` on Vercel. New `fetchPageWithBrowser()` service function. New POST `/api/preview?mode=browser` or `useHeadless: true` request flag. |
</phase_requirements>

---

## Summary

Phase 4 has three requirements but only two require new work. CORE-07 is complete. CORE-08 requires installing `@sparticuz/chromium` + `puppeteer-core`, adding a new `page-fetcher-browser.ts` service, and wiring a headless rendering path through the existing preview and feed creation flow. CORE-06 requires a UI panel that shows the auto-detected selectors as editable inputs and lets the user re-run preview with their adjustments.

The architectural challenge for CORE-08 is that the existing app is a single-function Express catch-all (`api/index.ts`) on Vercel. The headless browser function will need elevated memory (at minimum 512 MB, recommend 1024–1600 MB) and an increased `maxDuration`. Since this is a single Vercel function entry point, the memory/duration config applies to the whole function — this is a constraint to note in planning.

The critical implementation insight for CORE-08: Chromium should NOT be launched on every request. The browser should be reused across requests when possible (lazy singleton pattern). On Vercel serverless, a warm instance reuses the existing browser connection.

**Primary recommendation:** Add `@sparticuz/chromium@^134.0.0` + `puppeteer-core@^22.0.0`, wrap in a `page-fetcher-browser.ts` service with a singleton browser, add a `needs_js` detection heuristic in `page-fetcher.ts`, then expose an opt-in `useHeadless` flag in the preview API. For CORE-06, extend the preview UI with an "Adjust Selectors" collapsible panel that shows detected selectors as text inputs.

---

## Standard Stack

### Core (for CORE-08)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@sparticuz/chromium` | `^134.0.0` (or latest, check Puppeteer compat) | Pre-built Chromium binary for serverless | Purpose-built for AWS Lambda/Vercel; fits in 250 MB bundle limit |
| `puppeteer-core` | `^22.0.0` (match Chromium version) | Headless browser control | No bundled browser — uses @sparticuz/chromium binary instead |

**Version coupling:** @sparticuz/chromium versions track Chromium major version (e.g. v134 ships Chromium 134). Match to your puppeteer-core's supported Chromium version. Check [pptr.dev/chromium-support](https://pptr.dev/chromium-support) for the current mapping. As of early 2025, community reports show `@sparticuz/chromium@132.0.0` compatible with `puppeteer-core@22.11.2`, and `@sparticuz/chromium@138.0.1` compatible with `puppeteer-core@24.10.2`.

**Important:** `@sparticuz/chromium` does NOT follow semver. Breaking changes can occur at patch level.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cheerio` (already installed) | `^1.2.0` | Static HTML parsing | Default path — always try Cheerio first |
| `puppeteer` (devDependency) | latest | Local dev — full puppeteer with bundled Chrome | Local development only; never deploy |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sparticuz/chromium | @sparticuz/chromium-min | `-min` requires hosting the binary pack externally (CDN URL); adds complexity. Full package fits in 250 MB limit on Vercel. Use full package. |
| @sparticuz/chromium | Playwright | User locked decision — not using Playwright |

**Installation:**
```bash
npm install @sparticuz/chromium puppeteer-core
npm install --save-dev puppeteer
```

---

## Architecture Patterns

### Recommended File Structure Changes
```
src/
├── services/
│   ├── page-fetcher.ts          # EXISTING — add JS-need detection
│   ├── page-fetcher-browser.ts  # NEW — headless browser fetcher
│   ├── auto-detector.ts         # EXISTING — unchanged (CORE-07 done)
│   └── ...
├── routes/api/
│   ├── preview.ts               # EXISTING — add useHeadless flag support
│   └── feeds.ts                 # EXISTING — add useHeadless flag on create
└── ...

public/js/
└── create-feed.js               # EXISTING — add selector adjustment panel
```

### Pattern 1: Lazy Browser Singleton
**What:** Keep one Chromium browser instance alive across requests in the same warm serverless function invocation.
**When to use:** Always. Launching a new browser for every request is ~3-8x slower.

```typescript
// src/services/page-fetcher-browser.ts
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

let browserInstance: puppeteer.Browser | null = null;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  // Disable GPU/graphics for serverless environment
  chromium.setGraphicsMode = false;
  browserInstance = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: 'shell',  // 'shell' is the correct mode for @sparticuz/chromium
  });
  return browserInstance;
}

export async function fetchPageWithBrowser(url: string): Promise<FetchResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const html = await page.content();
    return { ok: true, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Browser fetch failed';
    return { ok: false, error: message };
  } finally {
    await page.close(); // Always close page, not browser
  }
}
```

**Source:** @sparticuz/chromium README + community gist (kettanaito), cross-verified with peterwhite.dev/posts/vercel-puppeteer-2024.

### Pattern 2: JS-Need Detection Heuristic
**What:** Before attempting headless, check if static HTML already contains meaningful content.
**When to use:** Called by preview API to auto-suggest whether to use headless mode.

The key signal: if Cheerio extracts very little text from `<body>` relative to `<script>` tags, or if body text is minimal while the page has many script tags, it's likely JS-rendered.

```typescript
// Add to page-fetcher.ts or auto-detector.ts
export function likelyNeedsJavaScript(html: string): boolean {
  const $ = cheerio.load(html);

  // Remove script and style from body before measuring text
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  // Heuristics:
  // 1. Body text is very short (under 200 chars) — likely empty SPA shell
  if (bodyText.length < 200) return true;

  // 2. Many <script> tags with very little visible text
  const scriptCount = $('script').length;
  if (scriptCount > 5 && bodyText.length < 500) return true;

  // 3. Common SPA root patterns with no content
  const spaRoots = ['#root', '#app', '[data-reactroot]', '#__nuxt', '#__next'];
  for (const selector of spaRoots) {
    const el = $(selector);
    if (el.length > 0 && el.text().trim().length < 50) return true;
  }

  return false;
}
```

**Confidence:** MEDIUM — these heuristics are derived from common patterns, not an authoritative source. They will miss edge cases. The intent is to surface a suggestion to the user, not to make an automatic decision.

### Pattern 3: Opt-In Headless Flag in Preview API
**What:** The preview API accepts `useHeadless: true` to switch from Cheerio to browser fetching.
**When to use:** When `likelyNeedsJavaScript()` returns true (auto-suggest), OR when user explicitly requests it.

```typescript
// preview.ts — modified handler
interface PreviewRequest {
  url: string;
  selectors?: Partial<FeedSelectors>;
  useHeadless?: boolean;  // NEW: opt-in headless mode
}

// In handler:
const useHeadless = body.useHeadless === true;
const result = useHeadless
  ? await fetchPageWithBrowser(body.url)
  : await fetchPage(body.url);

// After static fetch, check if page likely needs JS (auto-suggest)
if (!useHeadless && result.ok && result.html) {
  const suggestHeadless = likelyNeedsJavaScript(result.html);
  // Return this flag in response so UI can offer the option
}
```

### Pattern 4: Simplified Selector Picker UI (CORE-06)
**What:** After preview, show a collapsible "Adjust Selectors" panel with text inputs pre-filled from auto-detected selectors. User edits, clicks "Re-preview".
**When to use:** Always available after a successful preview, highlighted when auto-detect confidence is low or item count is 0.

The existing `previewRouter.post('/')` already returns `selectors` in its response. The UI simply needs to:
1. Capture the returned `selectors` object after first preview
2. Show an expandable panel with text inputs for `item`, `title`, `link`, `description`, `date`
3. On "Re-preview", pass the edited selectors back to `POST /api/preview` as `body.selectors`

This is pure vanilla JS + existing Tailwind/daisyUI patterns — no new libraries.

```javascript
// create-feed.js — extend renderPreview()
function renderSelectorPanel(selectors) {
  // Show collapsible <details> with 5 inputs
  // Pre-fill from selectors returned by preview API
  // On change, update lastPreviewData.selectors
  // "Re-preview" button calls preview API with updated selectors
}
```

### Anti-Patterns to Avoid
- **Launching browser per request:** Creating `puppeteer.launch()` on every request adds 3-8 seconds of cold start. Use singleton.
- **Not closing pages:** Forgetting `page.close()` in finally block leaks file descriptors. Vercel has a 1,024 fd limit.
- **Using full `puppeteer` (not puppeteer-core) in production:** Full puppeteer bundles its own Chromium (~300 MB), exceeds Vercel's 250 MB limit.
- **`waitUntil: 'networkidle0'`:** Too strict for sites with long-polling — use `'networkidle2'` or `'domcontentloaded'` + wait for specific selector.
- **Silently falling back to headless:** The decision to use headless should be opt-in/surfaced to user. Silent fallback hides errors.
- **Configuring memory/duration for a non-existent separate function:** The current app is a single `api/index.ts` catch-all. Functions config in `vercel.json` must reference `api/index.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chromium binary for serverless | Custom binary packaging | `@sparticuz/chromium` | Handles Lambda/Vercel-compatible build, decompression, caching, architecture detection |
| Browser launch args for serverless | Custom --no-sandbox flags list | `chromium.args` | Pre-tested set of flags for serverless; missing one causes crash |
| Executable path resolution | Custom binary location logic | `chromium.executablePath()` | Handles decompression of brotli-compressed binary at runtime |

**Key insight:** The serverless Chromium setup is not just "launch with --no-sandbox." There are ~20 args required for stability in a sandbox-less Lambda environment. `chromium.args` provides the tested set.

---

## Common Pitfalls

### Pitfall 1: Version Mismatch Between puppeteer-core and @sparticuz/chromium
**What goes wrong:** "Protocol error: ... browser has been closed" or "Failed to launch the browser process" — Chrome DevTools Protocol version mismatch.
**Why it happens:** puppeteer-core expects a specific Chrome version's DevTools Protocol. @sparticuz/chromium ships a specific Chrome version. If they don't align, communication fails.
**How to avoid:** Check [pptr.dev/chromium-support](https://pptr.dev/chromium-support) to find which Chromium version a given puppeteer-core version supports. Install the matching @sparticuz/chromium major version.
**Warning signs:** `Protocol error` in logs, `browser.connected` goes false immediately.

### Pitfall 2: Bundle Size Exceeds 250 MB
**What goes wrong:** Vercel deployment fails or function is too large.
**Why it happens:** @sparticuz/chromium contains a compressed Chromium binary (~60-80 MB uncompressed).
**How to avoid:** Use `puppeteer-core` (not `puppeteer`), use `@sparticuz/chromium` (not chromium-min unless hosting binary externally). The full package fits within 250 MB when combined with the rest of the app.
**Warning signs:** Vercel build log shows "Function size limit exceeded."

### Pitfall 3: Memory Exhaustion in Serverless
**What goes wrong:** Function crashes with OOM error or hangs.
**Why it happens:** Default Vercel function memory is 2 GB / 1 vCPU, which is usually sufficient, but Chromium needs at minimum 512 MB. Without `chromium.setGraphicsMode = false`, it tries to use GPU resources that don't exist.
**How to avoid:** Always set `chromium.setGraphicsMode = false` for serverless. Verify vercel.json has at least 1024 MB configured for `api/index.ts` if needed.
**Warning signs:** Function exits with signal 9 (SIGKILL = OOM).

### Pitfall 4: vercel.json `functions` Key Must Match Actual File Path
**What goes wrong:** Memory/duration config has no effect.
**Why it happens:** The glob pattern in `vercel.json` `functions` key must exactly match the function file path. This project uses `api/index.ts` as a catch-all. Using `api/**/*` won't match if there's only one file.
**How to avoid:** Use `"api/index.ts": { "memory": 1024, "maxDuration": 60 }`.
**Warning signs:** Function still times out with the old limits after config change.

### Pitfall 5: Page Not Awaiting JavaScript Execution Fully
**What goes wrong:** Headless fetch returns the same empty HTML as static fetch — content still missing.
**Why it happens:** `waitUntil: 'domcontentloaded'` fires before JS renders content. SPAs render asynchronously.
**How to avoid:** Use `waitUntil: 'networkidle2'` (waits until no more than 2 network connections for 500ms). For SPAs, also consider `page.waitForSelector()` for a known content element.
**Warning signs:** Headless HTML has same low text count as static HTML.

### Pitfall 6: File Descriptor Leak
**What goes wrong:** Function works initially but fails on subsequent requests in the same warm instance with "too many open files."
**Why it happens:** `page.close()` not called in error paths.
**How to avoid:** Always use try/finally to close pages: `try { ... } finally { await page.close(); }`.

---

## Code Examples

### Complete page-fetcher-browser.ts
```typescript
// Source: @sparticuz/chromium README + community-verified patterns
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import type { FetchResult } from '../types/feed.js';

let browserInstance: puppeteer.Browser | null = null;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  // Disable graphics mode (no GPU in serverless)
  chromium.setGraphicsMode = false;
  browserInstance = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: 'shell',
  });
  return browserInstance;
}

export async function fetchPageWithBrowser(
  url: string,
  timeoutMs = 20000
): Promise<FetchResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    const html = await page.content();
    return { ok: true, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Browser fetch failed';
    return { ok: false, error: message };
  } finally {
    await page.close();
  }
}
```

### vercel.json with Memory and Duration for Single Catch-All Function
```json
{
  "version": 2,
  "framework": null,
  "buildCommand": "npm run build:css",
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api" }
  ]
}
```

### JS-Need Heuristic (in page-fetcher.ts or auto-detector.ts)
```typescript
// Source: derived from common SPA patterns — MEDIUM confidence
import * as cheerio from 'cheerio';

export function likelyNeedsJavaScript(html: string): boolean {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  if (bodyText.length < 200) return true;

  const scriptCount = $('script[src]').length;
  if (scriptCount > 5 && bodyText.length < 500) return true;

  const spaRoots = ['#root', '#app', '[data-reactroot]', '#__nuxt', '#__next'];
  for (const sel of spaRoots) {
    if ($(sel).length > 0 && $(sel).text().trim().length < 50) return true;
  }

  return false;
}
```

### Selector Adjustment Panel (HTML pattern for create-feed page)
```html
<!-- daisyUI collapse component — fits existing pattern -->
<div class="collapse collapse-arrow bg-base-200 mt-4" id="selector-panel">
  <input type="checkbox" />
  <div class="collapse-title font-medium">Adjust Selectors</div>
  <div class="collapse-content">
    <div class="form-control mb-2">
      <label class="label"><span class="label-text">Item container</span></label>
      <input type="text" id="sel-item" class="input input-bordered input-sm" placeholder="e.g. article, .post">
    </div>
    <div class="form-control mb-2">
      <label class="label"><span class="label-text">Title</span></label>
      <input type="text" id="sel-title" class="input input-bordered input-sm" placeholder="e.g. h2 a, .title">
    </div>
    <!-- link, description, date inputs follow same pattern -->
    <button id="btn-repreview" class="btn btn-sm btn-outline mt-2">
      Re-preview with these selectors
    </button>
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright for serverless | @sparticuz/chromium (Chromium only) | 2022+ | Playwright too large for 50 MB limits; chromium-min + external binary was workaround |
| 50 MB Vercel function limit requiring chromium-min | 250 MB limit, full @sparticuz/chromium fits | 2024 | No longer need external binary hosting for most cases |
| `headless: true` | `headless: 'shell'` | Puppeteer v21+ | `true` is deprecated; `'shell'` is the correct mode for @sparticuz/chromium builds |
| Per-request browser launch | Lazy singleton browser | Best practice | Cold-start costs 3-8s per browser launch on serverless |

**Deprecated/outdated:**
- `headless: true`: Deprecated in Puppeteer v21. Use `headless: 'shell'` for @sparticuz/chromium (which uses the headless shell build).
- `chromium-min` with external binary: Only needed if function size exceeds 250 MB. Not needed here.

---

## Open Questions

1. **Local dev browser for headless path**
   - What we know: `puppeteer-core` doesn't bundle Chrome. Local dev without full `puppeteer` installed will fail the headless path.
   - What's unclear: Does the project need a local dev detection pattern (e.g. `if (process.env.VERCEL)`) or a devDependency on full `puppeteer`?
   - Recommendation: Add `puppeteer` as a devDependency and use `process.env.VERCEL` or `process.env.NODE_ENV !== 'development'` guard. In dev, fall back to system Chrome path or skip the headless test.

2. **When should headless be used during feed refresh (cron or manual)?**
   - What we know: `feeds.ts` POST `/:id/refresh` currently only uses `fetchPage()` (static). If a feed was created with headless, refresh needs headless too.
   - What's unclear: Where to store "this feed needs headless" — the `selectors` JSONB column could carry a `useHeadless: boolean` field, or a separate `feeds` column.
   - Recommendation: Store `useHeadless` as a field inside the `selectors` JSON (no schema change needed). The planner should decide if a schema migration is worth it for explicitness.

3. **Vercel plan limits**
   - What we know: Hobby plan has 2 GB max memory (default) and 300s max duration (configurable). Pro plan has 4 GB and 800s.
   - What's unclear: What plan is this project on?
   - Recommendation: Design for Hobby limits (1024 MB, 60s maxDuration). This is sufficient for headless scraping of typical sites.

4. **Race condition on browser singleton across concurrent requests**
   - What we know: Vercel serverless can handle multiple concurrent requests in the same warm instance. If two requests hit `getBrowser()` simultaneously when `browserInstance` is null, two browsers may launch.
   - What's unclear: Whether this is a real problem at current usage scale.
   - Recommendation: Add a launch mutex (simple promise-based lock). Low priority for MVP — note in task.

---

## Sources

### Primary (HIGH confidence)
- [Vercel Functions Limits docs](https://vercel.com/docs/functions/limitations) — 250 MB bundle limit, 2 GB/1 vCPU default memory, 300s max duration (Hobby), functions config in vercel.json
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json) — `functions` key with `memory` and `maxDuration` per file path
- [@sparticuz/chromium README](https://github.com/Sparticuz/chromium/blob/master/README.md) — `executablePath()`, `chromium.args`, `setGraphicsMode`, memory requirements (512 MB min, 1600 MB recommended), `headless: 'shell'`

### Secondary (MEDIUM confidence)
- [Peter White - Vercel Puppeteer 2024](https://peterwhite.dev/posts/vercel-puppeteer-2024) — practical TypeScript implementation, `setGraphicsMode = false`, singleton browser pattern
- [kettanaito Vercel Chromium gist](https://gist.github.com/kettanaito/56861aff96e6debc575d522dd03e5725) — vercel.json with `memory: 1024, maxDuration: 60`, complete code example
- [pptr.dev chromium-support](https://pptr.dev/chromium-support) — version compatibility table (puppeteer-core version → Chromium version)

### Tertiary (LOW confidence)
- Community reports: @sparticuz/chromium@132.0.0 + puppeteer-core@22.11.2, and @sparticuz/chromium@138.0.1 + puppeteer-core@24.10.2 — not verified from official source
- JS-need detection heuristics — derived from SPA patterns, not from an authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from @sparticuz/chromium README and Vercel official docs
- Architecture patterns: HIGH (browser singleton, vercel.json config) / MEDIUM (JS-need heuristic, selector picker UI)
- Pitfalls: HIGH (bundle size, file descriptors, vercel.json path) / MEDIUM (version mismatch, heuristic accuracy)

**Research date:** 2026-02-17
**Valid until:** 2026-04-17 (90 days — @sparticuz/chromium releases frequently; re-check version compat before installing)
