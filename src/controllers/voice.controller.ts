import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function registerVoiceRoutes(app: FastifyInstance) {
  // Incoming call webhook - returns TwiML
  app.post(
    '/incoming',
    {
      schema: {
        tags: ['voice'],
        description: 'Twilio webhook for incoming calls - returns TwiML to establish media stream',
        body: Type.Object({
          CallSid: Type.String(),
          From: Type.String(),
          To: Type.String(),
          CallStatus: Type.String(),
        }),
        produces: ['application/xml'],
      },
    },
    async (
      request: FastifyRequest<{
        Body: { CallSid: string; From: string; To: string; CallStatus: string };
      }>,
      reply: FastifyReply
    ) => {
      const { CallSid, From } = request.body;

      app.log.info({ CallSid, From }, 'Incoming call received');

      const response = new VoiceResponse();

      // Greet the caller
      response.say('Hello! Please wait while I connect you to our AI assistant.');

      // Connect to media stream
      const connect = response.connect();
      const host = request.headers.host;

      connect.stream({
        url: `wss://${host}/api/voice/media-stream`,
      });

      reply.type('application/xml');
      return response.toString();
    }
  );

  // Call status webhook
  app.post(
    '/status',
    {
      schema: {
        tags: ['voice'],
        description: 'Twilio webhook for call status updates',
        body: Type.Object({
          CallSid: Type.String(),
          CallStatus: Type.String(),
          Timestamp: Type.Optional(Type.String()),
          CallDuration: Type.Optional(Type.String()),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
          }),
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { CallSid: string; CallStatus: string; Timestamp?: string; CallDuration?: string };
      }>

    ) => {
      const { CallSid, CallStatus, CallDuration } = request.body;

      app.log.info(
        {
          CallSid,
          CallStatus,
          CallDuration,
        },
        'Call status update received'
      );

      // You can store this in MongoDB for analytics
      // await mongoDBService.getCollection('call_logs').updateOne(...)

      return { success: true };
    }
  );
}
