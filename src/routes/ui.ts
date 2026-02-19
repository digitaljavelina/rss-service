import { Router } from 'express';
import { layout, sidebar, pages } from '../templates.js';
import { supabase } from '../db/index.js';

// Create UI router
export const uiRouter = Router();

// Helper function to serve HTML pages
function servePage(pageName: string): string {
  const content = pages[pageName] || '<h1>Page not found</h1>';

  return layout
    .replace('{{sidebar}}', sidebar)
    .replace('{{content}}', content);
}

// Routes
uiRouter.get('/', async (req, res) => {
  try {
    const { count } = await supabase
      .from('feeds')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      return res.redirect(302, '/feeds');
    }
  } catch {
    // DB error — fall through to landing page
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('home'));
});

uiRouter.get('/create', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('create'));
});

uiRouter.get('/feeds', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('feeds'));
});

uiRouter.get('/feeds/:slug/edit', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('editFeed'));
});

uiRouter.get('/settings', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('settings'));
});
