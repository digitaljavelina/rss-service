import { Router } from 'express';
import { previewRouter } from './api/preview.js';
import { feedsApiRouter } from './api/feeds.js';
import { settingsApiRouter } from './api/settings.js';
import { feedsRouter } from './feeds.js';
import { uiRouter } from './ui.js';

// Create main router
export const router = Router();

// Mount API routes first (most specific)
router.use('/api/preview', previewRouter);
router.use('/api/feeds', feedsApiRouter);
router.use('/api/settings', settingsApiRouter);

// Mount UI routes before feed XML routes
// UI routes handle /feeds (dashboard) and /feeds/:slug/edit (edit page)
// These exact matches must come before the parameterized feed XML route
router.use('/', uiRouter);

// Mount feed XML routes last (catches /feeds/:slug for RSS/Atom XML)
router.use('/feeds', feedsRouter);
