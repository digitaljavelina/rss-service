import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router } from '../src/routes/index.js';

// Create Express app for Vercel serverless
const app = express();

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (relative to project root)
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d', etag: true }));

// Mount routes
app.use(router);

// Export for Vercel
export default app;
