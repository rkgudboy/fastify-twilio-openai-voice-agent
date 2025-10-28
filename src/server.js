/**
 * Voice AI Agent - Fastify Backend
 * Real-time voice conversations using Twilio, OpenAI, ChromaDB, and MongoDB
 */

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import corsPlugin from '@fastify/cors';
import swaggerPlugin from '@fastify/swagger';
import swaggerUiPlugin from '@fastify/swagger-ui';
import config from './config/config.js';
import mongodbService from './services/mongodb.service.js';
import chromadbService from './services/chromadb.service.js';
import connectionManager from './websocket/connection-manager.js';
import twilioRoutes from './routes/twilio.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

/**
 * Create Fastify server with logging
 */
const fastify = Fastify({
  logger: {
    level: config.logging.level,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

/**
 * Register plugins
 */
// WebSocket support
await fastify.register(websocketPlugin);

// CORS support
await fastify.register(corsPlugin, {
  origin: config.cors.origins === '*' ? true : config.cors.origins.split(','),
  credentials: true
});

// Swagger documentation
await fastify.register(swaggerPlugin, {
  openapi: {
    info: {
      title: 'Voice AI Agent API',
      description: 'Real-time voice conversations with AI using Twilio, OpenAI, ChromaDB, and MongoDB',
      version: config.app.version
    },
    servers: [
      {
        url: `http://localhost:${config.app.port}`,
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Twilio', description: 'Twilio webhook endpoints' },
      { name: 'Knowledge Base', description: 'Knowledge base management' },
      { name: 'Analytics', description: 'System analytics and metrics' }
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header'
        }
      }
    }
  }
});

// Swagger UI
await fastify.register(swaggerUiPlugin, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
});

/**
 * Lifecycle hooks
 */
fastify.addHook('onReady', async () => {
  try {
    fastify.log.info('Starting Voice AI Agent Backend...');

    // Connect to MongoDB
    await mongodbService.connect();
    fastify.log.info('MongoDB connected');

    // Initialize ChromaDB
    await chromadbService.initialize();
    fastify.log.info('ChromaDB initialized');

    fastify.log.info('All services initialized successfully');
  } catch (error) {
    fastify.log.error('Error initializing services:', error);
    throw error;
  }
});

fastify.addHook('onClose', async () => {
  try {
    fastify.log.info('Shutting down Voice AI Agent Backend...');

    // Close MongoDB connection
    await mongodbService.close();
    fastify.log.info('MongoDB connection closed');

    fastify.log.info('All services closed successfully');
  } catch (error) {
    fastify.log.error('Error closing services:', error);
  }
});

/**
 * Root endpoint
 */
fastify.get('/', {
  schema: {
    tags: ['Health'],
    description: 'Root endpoint with service information',
    response: {
      200: {
        type: 'object',
        properties: {
          service: { type: 'string' },
          status: { type: 'string' },
          version: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    service: 'Voice AI Agent API',
    status: 'running',
    version: config.app.version,
    timestamp: new Date().toISOString()
  };
});

/**
 * Health check endpoint
 */
fastify.get('/health', {
  schema: {
    tags: ['Health'],
    description: 'System health check including MongoDB and ChromaDB',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          mongodb: {
            type: 'object',
            properties: {
              status: { type: 'string' }
            }
          },
          chromadb: {
            type: 'object',
            properties: {
              status: { type: 'string' }
            }
          },
          timestamp: { type: 'string' }
        }
      },
      503: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          error: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const mongoHealth = await mongodbService.healthCheck();
    const chromaHealth = chromadbService.healthCheck();

    const overallHealth =
      mongoHealth.status === 'healthy' && chromaHealth.status === 'healthy'
        ? 'healthy'
        : 'unhealthy';

    const healthStatus = {
      status: overallHealth,
      mongodb: mongoHealth,
      chromadb: chromaHealth,
      timestamp: new Date().toISOString()
    };

    const statusCode = overallHealth === 'healthy' ? 200 : 503;
    return reply.code(statusCode).send(healthStatus);
  } catch (error) {
    fastify.log.error('Error in health check:', error);
    return reply.code(503).send({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Register API routes
 */
await fastify.register(twilioRoutes, { prefix: '/api/v1/twilio' });
await fastify.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });
await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics' });

/**
 * WebSocket endpoint for Twilio media streaming
 */
fastify.get('/ws/media/:callSid', { websocket: true }, (connection, request) => {
  const { callSid } = request.params;

  fastify.log.info(`WebSocket connection established for call: ${callSid}`);

  // Handle connection
  connectionManager.connect(connection.socket, callSid).then(() => {
    // Handle media stream
    connectionManager.handleMediaStream(connection.socket, callSid).catch((error) => {
      fastify.log.error(`Error in media stream for call ${callSid}:`, error);
    });
  });

  // Handle disconnection
  connection.socket.on('close', async () => {
    fastify.log.info(`WebSocket disconnected for call: ${callSid}`);
    await connectionManager.disconnect(callSid);
  });

  // Handle errors
  connection.socket.on('error', (error) => {
    fastify.log.error(`WebSocket error for call ${callSid}:`, error);
  });
});

/**
 * Error handler
 */
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
    statusCode: error.statusCode || 500
  });
});

/**
 * Start server
 */
const start = async () => {
  try {
    const address = await fastify.listen({
      port: config.app.port,
      host: config.app.host
    });

    fastify.log.info(`Server listening on ${address}`);
    fastify.log.info(`API docs: ${address}/docs`);
    fastify.log.info(`Health check: ${address}/health`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('SIGINT received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// Start the server
start();
