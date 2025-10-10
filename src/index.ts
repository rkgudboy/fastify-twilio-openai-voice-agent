import { buildApp } from './app.js';
import { startServer, shutdownServer } from './server.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point
 */
async function main() {
  try {
    // Build the Fastify application
    const app = await buildApp();

    // Start the server
    await startServer(app);

    // Handle graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info({ signal }, 'Received shutdown signal');
        await shutdownServer(app);
      });
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, 'Unhandled promise rejection');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start application');
    process.exit(1);
  }
}

// Start the application
main();
