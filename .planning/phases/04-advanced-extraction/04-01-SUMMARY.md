# Phase 04 Plan 01 Summary: Headless Browser Infrastructure

**Executed:** 2026-02-17
**Status:** Complete
**Requirement:** CORE-08

---

## What Was Built

### Dependencies Installed
- `@sparticuz/chromium@143.0.4` - Pre-built Chromium binary for serverless
- `puppeteer-core@24.37.3` - Browser control without bundled Chrome
- `puppeteer@24.37.3` (devDependency) - Full puppeteer for local development

### New Files

**src/services/page-fetcher-browser.ts**
- `fetchPageWithBrowser(url, timeoutMs?)` - Fetches page using headless Chromium
- Lazy singleton browser pattern (reuses browser across warm serverless instances)
- Environment detection: uses `@sparticuz/chromium` on Vercel, full `puppeteer` locally
- Proper page cleanup in finally block (prevents file descriptor leaks)
- Uses `waitUntil: 'networkidle2'` for SPA content loading

### Modified Files

**src/services/page-fetcher.ts**
- Added `likelyNeedsJavaScript(html)` heuristic function
- Detects SPA shells via:
  - Body text < 200 chars
  - Many script tags (>5) with little text (<500 chars)
  - SPA root selectors (#root, #app, [data-reactroot], #__nuxt, #__next) with minimal content

**vercel.json**
- Added `functions` config for `api/index.ts`
- Memory: 1024 MB (sufficient for Chromium)
- maxDuration: 60 seconds (allows headless fetch to complete)

---

## Verification

- [x] `npm ls @sparticuz/chromium puppeteer-core` - Both installed
- [x] `npx tsc --noEmit` - No type errors
- [x] `fetchPageWithBrowser` exported from page-fetcher-browser.ts
- [x] `likelyNeedsJavaScript` exported from page-fetcher.ts
- [x] vercel.json has memory: 1024, maxDuration: 60

---

## Next Steps

Plan 04-02 will wire the `useHeadless` flag through the preview and feed creation APIs, enabling the UI to request headless rendering when `likelyNeedsJavaScript()` returns true.
