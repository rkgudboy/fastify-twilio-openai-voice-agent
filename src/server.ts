import { FastifyInstance } from 'fastify';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { knowledgeBaseService } from './services/knowledge-base.service.js';
import { mongoDBService } from './services/mongodb.service.js';
import { sessionManagerService } from './services/session-manager.service.js';

/**
 * Start the server and initialize all services
 */
export async function startServer(app: FastifyInstance): Promise<void> {
  try {
    logger.info('🚀 Starting Voice AI Agent server...');

    // Initialize MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoDBService.connect();
    await mongoDBService.initializeCollections();

    // Initialize ChromaDB knowledge base
    logger.info('Initializing knowledge base...');
    await knowledgeBaseService.initialize();

    // Start Fastify server
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(
      {
        port: env.PORT,
        host: env.HOST,
        nodeEnv: env.NODE_ENV,
      },
      '✅ Server started successfully'
    );

    logger.info(`📚 API Documentation available at http://${env.HOST}:${env.PORT}/docs`);
    logger.info(`💚 Health check available at http://${env.HOST}:${env.PORT}/api/health`);
    logger.info(`📊 Metrics available at http://${env.HOST}:${env.PORT}/api/metrics`);

    // Setup stale session cleanup (every hour)
    setInterval(() => {
      const cleaned = sessionManagerService.cleanupStale(3600000); // 1 hour
      if (cleaned > 0) {
        logger.info({ cleaned }, 'Cleaned up stale sessions');
      }
    }, 3600000);
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
export async function shutdownServer(app: FastifyInstance): Promise<void> {
  logger.info('⏳ Shutting down server...');

  try {
    // Close all active sessions
    const activeSessions = sessionManagerService.getActive();
    logger.info({ count: activeSessions.length }, 'Closing active sessions');

    for (const session of activeSessions) {
      sessionManagerService.delete(session.callSid);
    }

    // Close MongoDB connection
    await mongoDBService.disconnect();

    // Close Fastify server
    await app.close();

    logger.info('✅ Server shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error during shutdown');
    process.exit(1);
  }
}
