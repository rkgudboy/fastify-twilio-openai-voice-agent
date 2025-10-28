/**
 * Twilio webhook routes
 * Handles incoming calls and call status updates
 */

import twilio from 'twilio';
import config from '../config/config.js';
import mongodbService from '../services/mongodb.service.js';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Validate Twilio request (optional, can be enabled in production)
 */
function validateTwilioRequest(request) {
  // Skip validation in development
  if (config.app.env === 'development') {
    return true;
  }

  try {
    const signature = request.headers['x-twilio-signature'];
    const url = `${request.protocol}://${request.hostname}${request.url}`;
    const params = request.body;

    const validator = twilio.validateRequest(
      config.twilio.authToken,
      signature,
      url,
      params
    );

    return validator;
  } catch (error) {
    console.error('Error validating Twilio request:', error);
    return false;
  }
}

/**
 * Register Twilio routes
 */
export default async function twilioRoutes(fastify, options) {
  /**
   * Handle incoming call
   * Returns TwiML to establish WebSocket connection
   */
  fastify.post('/incoming', async (request, reply) => {
    try {
      const { CallSid, From, To, CallStatus } = request.body;

      console.log(`Incoming call: ${CallSid} from ${From} to ${To}`);

      // Create call session in database
      await mongodbService.createCallSession(CallSid, From, To);

      // Update call status
      await mongodbService.updateCallStatus(CallSid, 'in-progress');

      // Create TwiML response
      const response = new VoiceResponse();

      // Add a brief pause
      response.pause({ length: 1 });

      // Connect to WebSocket for media streaming
      const connect = response.connect();

      // Determine WebSocket URL (use request host)
      const protocol = request.headers['x-forwarded-proto'] || 'wss';
      const host = request.headers['host'];
      const wsUrl = `${protocol === 'https' ? 'wss' : 'ws'}://${host}/ws/media/${CallSid}`;

      connect.stream({
        url: wsUrl
      });

      console.log(`TwiML response created for call: ${CallSid}`);
      console.log(`WebSocket URL: ${wsUrl}`);

      reply
        .type('application/xml')
        .send(response.toString());
    } catch (error) {
      console.error('Error handling incoming call:', error);

      // Return error TwiML
      const response = new VoiceResponse();
      response.say("We're sorry, but we're unable to process your call at this time.");
      response.hangup();

      reply
        .type('application/xml')
        .send(response.toString());
    }
  });

  /**
   * Handle call status updates
   */
  fastify.post('/status', async (request, reply) => {
    try {
      const { CallSid, CallStatus, CallDuration } = request.body;

      console.log(`Call status update: ${CallSid} -> ${CallStatus}`);

      // Update call status in database
      await mongodbService.updateCallStatus(CallSid, CallStatus);

      // If call ended, store duration
      if (CallStatus === 'completed' && CallDuration) {
        await mongodbService.storeCallAnalytics(CallSid, {
          duration: parseInt(CallDuration),
          status: CallStatus
        });
      }

      reply.send({ success: true });
    } catch (error) {
      console.error('Error handling call status:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get call details
   */
  fastify.get('/call/:callSid', async (request, reply) => {
    try {
      const { callSid } = request.params;

      const callDetails = await mongodbService.getCallDetails(callSid);

      if (!callDetails) {
        return reply.code(404).send({ error: 'Call not found' });
      }

      reply.send(callDetails);
    } catch (error) {
      console.error('Error getting call details:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get call transcript
   */
  fastify.get('/call/:callSid/transcript', async (request, reply) => {
    try {
      const { callSid } = request.params;

      const transcript = await mongodbService.getCallTranscript(callSid);

      reply.send({
        call_sid: callSid,
        messages: transcript
      });
    } catch (error) {
      console.error('Error getting call transcript:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get recent calls
   */
  fastify.get('/calls/recent', async (request, reply) => {
    try {
      const limit = parseInt(request.query.limit) || 10;

      const calls = await mongodbService.getRecentCalls(limit);

      reply.send({
        calls: calls,
        count: calls.length
      });
    } catch (error) {
      console.error('Error getting recent calls:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Test TwiML generation
   */
  fastify.get('/test-twiml', async (request, reply) => {
    const response = new VoiceResponse();
    response.say('This is a test message from the Voice AI Agent.');
    response.pause({ length: 1 });
    response.say('If you can hear this, the TwiML generation is working correctly.');

    reply
      .type('application/xml')
      .send(response.toString());
  });
}
