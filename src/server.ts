import { app } from './app.js';
import getPort, { portNumbers } from 'get-port';
import { initializeDatabase } from './db/schema.js';
import pino from 'pino';

const logger = pino({ level: 'info' });

async function startServer(): Promise<void> {
  try {
    // Initialize database
    initializeDatabase();

    // Get available port
    const port = await getPort({ port: portNumbers(3000, 3100) });

    // Start server
    app.listen(port, () => {
      logger.info(`RSS Service running at http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
