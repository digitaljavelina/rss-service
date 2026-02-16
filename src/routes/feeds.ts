import { Router } from 'express';

// Create feeds router
export const feedsRouter = Router();

// Placeholder endpoint - will be implemented in Task 2
feedsRouter.get('/:identifier', (req, res) => {
  res.status(404).json({ error: 'Feed not found' });
});
