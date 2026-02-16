import express from 'express';
import compression from 'compression';
import { router } from './routes/index.js';

// Create Express app
export const app = express();

// Apply middleware in order
app.use(compression()); // gzip compression
app.use(express.json()); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL-encoded form data
app.use(express.static('public', { maxAge: '1d', etag: true })); // Static files with caching

// Mount routes
app.use(router);
