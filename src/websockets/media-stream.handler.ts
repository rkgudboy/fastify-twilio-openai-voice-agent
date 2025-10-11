import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { WebSocket } from 'ws';
import { sessionManagerService } from '../services/session-manager.service.js';
import { metricsService } from '../services/metrics.service.js';
import { setupOpenAIBridge } from './openai-bridge.handler.js';
import { TwilioMediaStreamMessage } from '../types/session.types.js';
import { safeJsonParse } from '../utils/validation.utils.js';
import { twilioToOpenAI } from '../utils/audio.utils.js';

export async function registerMediaStreamHandler(app: FastifyInstance) {
  app.register(async (fastify) => {
    fastify.get(
      '/media-stream',
      { websocket: true },
      async (connection: SocketStream) => {
        const ws: WebSocket = connection.socket;
        let callSid: string | null = null;
        let streamSid: string | null = null;

        app.log.info('📞 New WebSocket connection from Twilio');

        ws.on('message', async (message: Buffer) => {
          try {
            const data = safeJsonParse<TwilioMediaStreamMessage>(message.toString());

            if (!data) {
              app.log.warn('Invalid JSON received from Twilio');
              return;
            }

            switch (data.event) {
              case 'start':
                if (data.start) {
                  callSid = data.start.callSid;
                  streamSid = data.start.streamSid;

                  app.log.info(
                    {
                      callSid,
                      streamSid,
                      tracks: data.start.tracks,
                      mediaFormat: data.start.mediaFormat,
                    },
                    'Media stream started'
                  );

                  // Start metrics tracking
                  const metrics = metricsService.startCall(callSid);
                  metrics.track('call_start');

                  // Setup OpenAI bridge
                  const openaiWs = await setupOpenAIBridge(ws, callSid, streamSid, metrics, app);

                  // Create session
                  sessionManagerService.set(callSid, {
                    callSid,
                    streamSid,
                    twilioWs: ws,
                    openaiWs,
                    metrics,
                    status: 'active',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });

                  app.log.info({ callSid }, '✅ Session initialized');
                }
                break;

              case 'media':
                if (callSid && data.media) {
                  const session = sessionManagerService.get(callSid);
                  if (session?.openaiWs && session.openaiWs.readyState === WebSocket.OPEN) {
                    // Forward audio to OpenAI
                    // The audio payload is base64 encoded mulaw from Twilio
                    session.metrics.track('audio_received');

                    // Convert from Twilio mulaw 8kHz to OpenAI PCM16 24kHz
                    const pcm16Audio = twilioToOpenAI(data.media.payload);

                    // Send to OpenAI
                    session.openaiWs.send(
                      JSON.stringify({
                        type: 'input_audio_buffer.append',
                        audio: pcm16Audio,
                      })
                    );
                  }
                }
                break;

              case 'stop':
                if (callSid) {
                  app.log.info({ callSid }, 'Media stream stopped');
                  const session = sessionManagerService.get(callSid);
                  if (session) {
                    session.metrics.track('call_end');
                    metricsService.endCall(callSid);
                  }
                  sessionManagerService.delete(callSid);
                }
                break;

              case 'mark':
                // Mark events for synchronization
                app.log.debug({ callSid, mark: data.mark }, 'Mark event received');
                break;

              default:
                app.log.debug({ event: data.event }, 'Unknown Twilio event');
            }
          } catch (error) {
            app.log.error({ error, callSid }, 'Error processing Twilio WebSocket message');
          }
        });

        ws.on('close', (code, reason) => {
          app.log.info(
            {
              callSid,
              code,
              reason: reason.toString(),
            },
            'Twilio WebSocket closed'
          );

          if (callSid) {
            const session = sessionManagerService.get(callSid);
            if (session) {
              metricsService.endCall(callSid);
            }
            sessionManagerService.delete(callSid);
          }
        });

        ws.on('error', (error) => {
          app.log.error({ error, callSid }, 'Twilio WebSocket error');
        });
      }
    );
  });
}
