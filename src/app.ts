import express from 'express';
import compression from 'compression';
import { router } from './routes/index.js';
import { PgAdapter } from './db/pg-adapter.js';

// Create Express app
export const app = express();

// Apply middleware in order
app.use(compression()); // gzip compression
app.use(express.json()); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL-encoded form data
app.use(express.static('public', { maxAge: '1d', etag: true })); // Static files with caching

// Health check endpoint (before router for Docker HEALTHCHECK)
app.get('/health', async (_req, res) => {
  const uptime = process.uptime();

  try {
    await PgAdapter.getInstance().getPool().query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected', uptime });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable', uptime });
  }
});

// Mount routes
app.use(router);
