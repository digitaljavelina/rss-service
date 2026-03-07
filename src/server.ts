import 'dotenv/config';
import http from 'http';
import { app } from './app.js';
import { initializeDatabase } from './db/schema.js';
import { PgAdapter } from './db/pg-adapter.js';
import { startScheduler } from './services/scheduler.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Create HTTP server (needed for graceful shutdown)
const server = http.createServer(app);

// Cron task assigned by startScheduler(); null-checked in shutdown
let cronTask: { stop: () => void } | null = null;

/**
 * Graceful shutdown handler
 * Stops cron, closes HTTP server, closes DB pool
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received');

  // 1. Stop cron scheduler if running
  if (cronTask) {
    cronTask.stop();
    logger.info('Cron scheduler stopped');
  }

  // 2. Stop accepting new requests; wait for in-flight to complete
  server.close(async () => {
    logger.info('HTTP server closed');

    // 3. Close DB pool
    await PgAdapter.getInstance().shutdown();
    logger.info('DB pool closed');

    process.exit(0);
  });

  // 4. Force exit after 10s if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
}

// Register signal handlers SYNCHRONOUSLY at module level
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();

    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen(port, () => {
      logger.info({ port }, 'RSS Service running');

      // Start in-process cron scheduler
      cronTask = startScheduler();
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
