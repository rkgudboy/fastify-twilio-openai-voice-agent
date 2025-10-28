/**
 * Analytics routes
 * System metrics and call analytics
 */

import mongodbService from '../services/mongodb.service.js';
import connectionManager from '../websocket/connection-manager.js';

/**
 * Register Analytics routes
 */
export default async function analyticsRoutes(fastify, options) {
  /**
   * Get system-wide metrics
   */
  fastify.get('/system', async (request, reply) => {
    try {
      const metrics = await mongodbService.getSystemMetrics();

      // Add active session count
      metrics.active_sessions = connectionManager.getActiveSessionCount();

      reply.send({
        success: true,
        metrics: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting system metrics:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get call-specific analytics
   */
  fastify.get('/call/:callSid', async (request, reply) => {
    try {
      const { callSid } = request.params;

      const analytics = await mongodbService.getCallAnalytics(callSid);
      const callDetails = await mongodbService.getCallDetails(callSid);
      const transcript = await mongodbService.getCallTranscript(callSid);

      if (!callDetails) {
        return reply.code(404).send({ error: 'Call not found' });
      }

      reply.send({
        success: true,
        call_sid: callSid,
        analytics: analytics || {},
        call_details: callDetails,
        message_count: transcript.length
      });
    } catch (error) {
      console.error('Error getting call analytics:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get dashboard data
   */
  fastify.get('/dashboard', async (request, reply) => {
    try {
      const dashboardData = await mongodbService.getDashboardData();

      // Add active session info
      dashboardData.active_sessions = {
        count: connectionManager.getActiveSessionCount(),
        call_sids: connectionManager.getActiveSessionIds()
      };

      reply.send({
        success: true,
        dashboard: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Store call analytics
   */
  fastify.post('/call/:callSid/store', async (request, reply) => {
    try {
      const { callSid } = request.params;
      const analytics = request.body;

      await mongodbService.storeCallAnalytics(callSid, analytics);

      reply.send({
        success: true,
        call_sid: callSid
      });
    } catch (error) {
      console.error('Error storing call analytics:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get performance metrics
   */
  fastify.get('/performance', async (request, reply) => {
    try {
      const metrics = await mongodbService.getSystemMetrics();

      // Add runtime metrics
      const performanceMetrics = {
        system: metrics,
        active_sessions: connectionManager.getActiveSessionCount(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      reply.send({
        success: true,
        performance: performanceMetrics
      });
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}
