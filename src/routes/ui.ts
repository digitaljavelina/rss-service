import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create UI router
export const uiRouter = Router();

// Helper function to serve HTML pages
function servePage(pageName: string): string {
  const viewsDir = join(__dirname, '..', 'views');

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
