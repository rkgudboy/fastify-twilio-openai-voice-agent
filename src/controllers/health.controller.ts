import { FastifyInstance, FastifyReply } from 'fastify';
import { HealthResponseSchema, ReadinessResponseSchema } from '../types/api.types.js';
import { metricsService } from '../services/metrics.service.js';
import { mongoDBService } from '../services/mongodb.service.js';

export async function registerHealthRoutes(app: FastifyInstance) {
  // Health check endpoint
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        description: 'Health check endpoint - returns server health status',
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async () => {
      const stats = metricsService.getStats();
      const mongoHealthy = await mongoDBService.healthCheck();

      return {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        activeCalls: stats.activeCalls,
        databases: {
          mongodb: mongoHealthy ? 'connected' : 'disconnected',
          chromadb: 'initialized',
        },
      };
    }
  );

  // Readiness check endpoint
  app.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        description: 'Readiness probe - checks if service is ready to accept traffic',
        response: {
          200: ReadinessResponseSchema,
        },
      },
    },
    async (_request, reply: FastifyReply) => {
      const mongoReady = mongoDBService.isReady();

      const ready = mongoReady;

      if (!ready) {
        reply.status(503);
      }

      return {
        ready,
        checks: {
          mongodb: mongoReady,
          chromadb: true,
          openai: true,
        },
      };
    }
  );
}
