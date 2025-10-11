import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import formbody from '@fastify/formbody';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { swaggerConfig } from './config/swagger.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';

// Controllers
import { registerHealthRoutes } from './controllers/health.controller.js';
import { registerMetricsRoutes } from './controllers/metrics.controller.js';
import { registerVoiceRoutes } from './controllers/voice.controller.js';
import { registerKnowledgeRoutes } from './controllers/knowledge.controller.js';

// WebSocket handlers
import { registerMediaStreamHandler } from './websockets/media-stream.handler.js';

/**
 * Build and configure the Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    disableRequestLogging: true, // We use custom request logger middleware
    trustProxy: true, // Trust X-Forwarded-* headers
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register WebSocket plugin
  await app.register(websocket);

  // Register form body parser for Twilio webhooks
  await app.register(formbody);

  // Register Swagger documentation
  await app.register(swagger, swaggerConfig);

  // Register Swagger UI
  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Register middleware
  app.addHook('onRequest', requestLogger);
  app.setErrorHandler(errorHandler);

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'Voice AI Agent API',
      version: '1.0.0',
      status: 'running',
      documentation: '/docs',
      health: '/api/health',
      metrics: '/api/metrics',
    };
  });

  // Register API routes
  await app.register(registerHealthRoutes, { prefix: '/api' });
  await app.register(registerMetricsRoutes, { prefix: '/api' });
  await app.register(registerKnowledgeRoutes, { prefix: '/api/knowledge' });
  await app.register(registerVoiceRoutes, { prefix: '/api/voice' });

  // Register WebSocket handler for Twilio media streams
  await app.register(registerMediaStreamHandler, { prefix: '/api/voice' });

  return app;
}
