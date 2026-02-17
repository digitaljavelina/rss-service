import { Router } from 'express';
import { previewRouter } from './api/preview.js';
import { feedsApiRouter } from './api/feeds.js';
import { feedsRouter } from './feeds.js';
import { uiRouter } from './ui.js';

// Create main router
export const router = Router();

// Mount API routes first (more specific)
router.use('/api/preview', previewRouter);
router.use('/api/feeds', feedsApiRouter);

// Mount feed XML routes
router.use('/feeds', feedsRouter);

// Mount UI routes
router.use('/', uiRouter);
