import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import { router } from '../src/routes/index.js';
import { initializeDatabase } from '../src/db/schema.js';

// Create Express app
const app = express();

// Apply middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', { maxAge: '1d', etag: true }));

// Mount routes
app.use(router);

// Initialize database on cold start
let dbInitialized = false;
const initDb = async () => {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
};

// Wrap the app with db initialization
export default async function handler(req: any, res: any) {
  await initDb();
  return app(req, res);
}
