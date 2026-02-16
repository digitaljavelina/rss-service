import { Router } from 'express';
import { feedsRouter } from './feeds.js';
import { uiRouter } from './ui.js';

// Create main router
export const router = Router();

// Mount API routes first (more specific)
router.use('/feeds', feedsRouter);

// Mount UI routes
router.use('/', uiRouter);
