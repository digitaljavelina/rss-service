import { Router } from 'express';
import { layout, sidebar, pages } from '../templates.js';

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
uiRouter.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('home'));
});
