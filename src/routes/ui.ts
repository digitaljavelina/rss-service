import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

// Create UI router
export const uiRouter = Router();

// Helper function to serve HTML pages
function servePage(pageName: string): string {
  // Use process.cwd() for Vercel compatibility
  const viewsDir = join(process.cwd(), 'src', 'views');

  // Read layout, sidebar, and page content
  const layout = readFileSync(join(viewsDir, 'layouts', 'main.html'), 'utf-8');
  const sidebar = readFileSync(join(viewsDir, 'partials', 'sidebar.html'), 'utf-8');
  const content = readFileSync(join(viewsDir, 'pages', `${pageName}.html`), 'utf-8');

  // Replace placeholders
  return layout
    .replace('{{sidebar}}', sidebar)
    .replace('{{content}}', content);
}

// Routes
uiRouter.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(servePage('home'));
});
