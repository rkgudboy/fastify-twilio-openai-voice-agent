import { FastifyInstance } from 'fastify';
import { MetricsResponseSchema } from '../types/api.types.js';
import { metricsService } from '../services/metrics.service.js';

export async function registerMetricsRoutes(app: FastifyInstance) {
  app.get(
    '/metrics',
    {
      schema: {
        tags: ['metrics'],
        description: 'Get system performance metrics and statistics',
        response: {
          200: MetricsResponseSchema,
        },
      },
    },
    async () => {
      const stats = metricsService.getStats();
      return stats;
    }
  );
}
