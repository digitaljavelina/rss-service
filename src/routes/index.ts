import { Router } from 'express';
import { feedsRouter } from './feeds.js';

// Create main router
export const router = Router();

// Mount feeds router
router.use('/feeds', feedsRouter);

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});
