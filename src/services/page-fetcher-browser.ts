/**
 * Browser-based Page Fetcher Service
 * Uses headless Chromium for JavaScript-heavy pages
 * Implements lazy singleton pattern for browser reuse
 */

import type { Browser } from 'puppeteer-core';
import type { FetchResult } from '../types/feed.js';

let browserInstance: Browser | null = null;

/**
 * Get or create a browser instance (lazy singleton)
 * Reuses existing browser in warm serverless instances
 */
async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // Check if running on Vercel (production) or local dev
  const isVercel = !!process.env.VERCEL;

  if (isVercel) {
    // Production: use @sparticuz/chromium
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');

    // Disable GPU for serverless environment
    chromium.default.setGraphicsMode = false;

    browserInstance = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: 'shell',
    });
  } else {
    // Local dev: use full puppeteer with bundled Chrome
    try {
      const puppeteer = await import('puppeteer');
      browserInstance = await puppeteer.default.launch({
        headless: 'shell',
      });
    } catch {
      throw new Error(
        'Install puppeteer as devDependency for local headless support: npm install --save-dev puppeteer'
      );
    }
  }

  return browserInstance;
}

/**
 * Fetch a page using headless browser
 * Use for JavaScript-heavy sites that require rendering
 * @param url - The URL to fetch
 * @param timeoutMs - Navigation timeout in milliseconds
 * @returns FetchResult with rendered HTML content
 */
export async function fetchPageWithBrowser(
  url: string,
  timeoutMs = 20000
): Promise<FetchResult> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: timeoutMs,
    });

    const html = await page.content();
    return { ok: true, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Browser fetch failed';
    return { ok: false, error: message };
  } finally {
    await page.close();
  }
}
