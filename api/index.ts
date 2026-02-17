import 'dotenv/config';
import express from 'express';
import { router } from '../src/routes/index.js';
import { initializeDatabase } from '../src/db/schema.js';

// Create Express app
const app = express();

// Apply middleware (skip compression and static files - handled by Vercel)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use(router);

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Express error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize database on cold start
let dbInitialized = false;
const initDb = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('DB init failed:', error);
      // Don't throw - let the app continue
      dbInitialized = true;
    }
  }
};

// Wrap the app with db initialization
export default async function handler(req: any, res: any) {
  try {
    await initDb();
    return app(req, res);
  } catch (error: any) {
    console.error('Handler error:', error);
    res.status(500).json({ error: error.message || 'Handler failed' });
  }
}
