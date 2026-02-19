# RSS Service

## What This Is

A self-hosted RSS feed generator that creates feeds from any website, YouTube channel, or Reddit subreddit — deployed to Vercel with a Supabase backend.

## Core Value

**Create RSS feeds from anything.** Point at any URL, auto-detect content patterns, and get a feed you can subscribe to in your reader.

## The Problem

Many websites and social platforms don't provide RSS feeds, making it hard to follow updates without constantly checking each site manually. Existing services like rss.app solve this but run in the cloud, require subscriptions, and don't give you control over your data.

## The Solution

A self-hosted RSS feed generator with:
- **Auto-detection** — paste a URL and the system finds content patterns automatically
- **Headless browser** — automatic fallback for JavaScript-heavy sites
- **Platform integrations** — YouTube via Data API v3, Reddit via built-in RSS
- **Smart scheduling** — configurable per-feed refresh intervals with cron-based updates
- **Feed management** — dashboard with edit, delete, export/import
- **Clean UI** — uncluttered, easy to navigate, no feature bloat

## How It Works

1. Paste a URL into the web interface
2. System auto-detects content patterns (or uses platform API for YouTube/Reddit)
3. Preview extracted items before saving
4. Configure refresh schedule (every 15min, hourly, daily, etc.)
5. Get an RSS URL to add to your reader
6. Optionally export as static XML file

## Target User

Someone who:
- Uses an RSS reader as their primary way to follow content
- Wants to follow sites/accounts that don't offer RSS
- Prefers self-hosted tools over cloud services
- Values a clean, functional interface

## Constraints

- **Vercel deployment** — serverless functions, daily cron on Hobby plan
- **Supabase backend** — PostgreSQL database, free tier sufficient
- **API keys required** — YouTube integration needs user-provided credentials
- **Single user** — no auth/multi-user complexity

## Technical Direction

- **Stack:** TypeScript, Express, Supabase (PostgreSQL), Vercel serverless
- **Frontend:** EJS templates, Tailwind CSS v4 + daisyUI, Alpine.js
- **Extraction:** Cheerio (static), Puppeteer with @sparticuz/chromium (JS-heavy)
- **Scheduling:** Vercel cron → `/api/cron/scheduler` endpoint
- **Feed serving:** Express routes serve RSS XML at `/feeds/:slug`

## Requirements

### Validated

- ✓ Create RSS feed from any URL via content extraction — v1.0
- ✓ Auto-detect common content patterns — v1.0
- ✓ Preview extracted content before saving — v1.0
- ✓ Generate valid RSS 2.0 and Atom feeds — v1.0
- ✓ Headless browser for JavaScript-heavy pages — v1.0
- ✓ YouTube integration via Data API v3 — v1.0
- ✓ Reddit integration via built-in RSS — v1.0
- ✓ Configurable per-feed refresh intervals — v1.0
- ✓ Background cron-based feed updates — v1.0
- ✓ Serve feeds at public URLs — v1.0
- ✓ Export feeds as static XML files — v1.0
- ✓ Clean, uncluttered web UI — v1.0
- ✓ Feed management dashboard (list, edit, delete) — v1.0
- ✓ Feed export/import (JSON backup) — v1.0
- ✓ Content deduplication via SHA-256 GUIDs — v1.0
- ✓ API key management via settings page — v1.0
- ✓ Rate limit handling with backoff — v1.0
- ✓ Cache-Control + ETag for feed serving — v1.0

### Active

(None — ship to validate next milestone)

### Out of Scope

- Twitter/X integration — API costs $100+/month for read access, impractical for free tool
- Cloud deployment — runs on Vercel free tier, no enterprise hosting
- Multi-user/authentication — single user tool
- Native Mac app — web-first, works well as-is
- Feed aggregation/bundling — keep it simple
- Keyword filtering — v2 consideration
- Translation features — v2 consideration
- Offline mode — real-time/scheduled is core value

## Context

Shipped v1.0 with 5,198 LOC (TypeScript/JavaScript/EJS).
Tech stack: Express + Vercel serverless, Supabase (PostgreSQL), Cheerio + Puppeteer.
Production URL: https://rss-service-five.vercel.app/
Database: Supabase with feeds, items, and settings tables.
Cron: daily at midnight UTC (Vercel Hobby plan limit).
103 commits across 3 days of development.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over native | Faster to build, browser dev tools, native can come later | ✓ Good — shipped in 3 days |
| SQLite → Supabase | Required for Vercel serverless deployment | ✓ Good — zero-config, free tier |
| Auto-detection over CSS selectors | Better UX, users don't need to understand CSS | ✓ Good — works for most sites |
| Headless browser auto-fallback | No manual toggle, system detects JS-heavy pages | ✓ Good — transparent to users |
| Skip Twitter/X | API costs $100+/month for read access | ✓ Good — saved cost, focused on free APIs |
| Reddit built-in RSS over API | No API key needed, simpler and more reliable | ✓ Good — zero config for users |
| YouTube uploads playlist trick | UC→UU channelId trick: 1 quota unit vs 100 for search | ✓ Good — 100x more efficient |
| Daily cron for Vercel Hobby | Hobby plan limits to once/day; all intervals preserved for self-hosted/Pro | ⚠️ Revisit — upgrade to Pro for real-time |
| Content-based GUIDs (SHA-256) | Deduplication across extractions without centralized ID tracking | ✓ Good — no duplicate items |
| feed_type column routing | Routes preview/create/refresh/cron by feed_type | ✓ Good — clean extensibility |

---
*Last updated: 2026-02-18 after v1.0 milestone*
