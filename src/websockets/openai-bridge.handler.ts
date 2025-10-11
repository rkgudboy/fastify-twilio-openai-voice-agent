import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { MetricsCollector } from '../types/metrics.types.js';
import { getSystemPrompt } from '../prompts/system-prompt.js';
import { knowledgeBaseService } from '../services/knowledge-base.service.js';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

/**
 * Setup OpenAI Realtime API WebSocket bridge
 */
export async function setupOpenAIBridge(
  twilioWs: WebSocket,
  callSid: string,
  streamSid: string,
  metrics: MetricsCollector,
  app: FastifyInstance
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    let isReady = false;

    openaiWs.on('open', () => {
      app.log.info({ callSid }, '🤖 OpenAI WebSocket connected');

      // Configure session
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: getSystemPrompt(),
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'g711_ulaw', // Native mulaw 8kHz output - matches Twilio format
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: [
            {
              type: 'function',
              name: 'search_knowledge_base',
              description: 'Search the knowledge base for relevant information',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query',
                  },
                },
                required: ['query'],
              },
            },
          ],
        },
      };

      openaiWs.send(JSON.stringify(sessionConfig));
      metrics.track('openai_connected');
      isReady = true;
      resolve(openaiWs);
    });

    openaiWs.on('message', async (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString());

        switch (event.type) {
          case 'session.created':
            app.log.debug({ callSid }, 'OpenAI session created');
            break;

          case 'session.updated':
            app.log.debug({ callSid }, 'OpenAI session updated');
            break;

          case 'response.audio.delta':
            // Send audio back to Twilio
            if (event.delta && twilioWs.readyState === WebSocket.OPEN) {
              metrics.track('audio_sent');

              // OpenAI now outputs g711_ulaw directly (8kHz mulaw)
              // No conversion needed - forward directly to Twilio
              const twilioMessage = {
                event: 'media',
                streamSid: streamSid,
                media: {
                  payload: event.delta, // Already in base64 mulaw format
                },
              };

              twilioWs.send(JSON.stringify(twilioMessage));
            }
            break;

          case 'response.audio_transcript.delta':
            app.log.debug({ callSid, transcript: event.delta }, 'AI transcript');
            break;

          case 'conversation.item.input_audio_transcription.completed':
            app.log.info({ callSid, transcript: event.transcript }, 'User said');
            break;

          case 'response.function_call_arguments.done':
            // Handle function calls
            if (event.name === 'search_knowledge_base') {
              metrics.track('function_call', { function: 'search_knowledge_base' });

              try {
                const args = JSON.parse(event.arguments);
                const results = await knowledgeBaseService.search(args.query, 3);

                const output = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: event.call_id,
                    output: JSON.stringify({
                      results: results.map((r) => ({
                        text: r.text,
                        score: r.score,
                      })),
                    }),
                  },
                };

                openaiWs.send(JSON.stringify(output));

                // Trigger response generation
                openaiWs.send(JSON.stringify({ type: 'response.create' }));

                app.log.info(
                  { callSid, query: args.query, resultsCount: results.length },
                  'Knowledge search completed'
                );
              } catch (error) {
                app.log.error({ error, callSid }, 'Function call failed');
              }
            }
            break;

          case 'error':
            app.log.error({ callSid, error: event.error }, 'OpenAI error');
            metrics.track('error', { source: 'openai', error: event.error });
            break;

          case 'response.done':
            app.log.debug({ callSid }, 'Response completed');
            break;

          default:
            // app.log.debug({ callSid, type: event.type }, 'OpenAI event');
            break;
        }
      } catch (error) {
        app.log.error({ error, callSid }, 'Error processing OpenAI message');
        metrics.track('error', { source: 'openai_message_processing' });
      }
    });

    openaiWs.on('error', (error) => {
      app.log.error({ error, callSid }, 'OpenAI WebSocket error');
      metrics.track('error', { source: 'openai_websocket' });
      if (!isReady) {
        reject(error);
      }
    });

    openaiWs.on('close', (code, reason) => {
      app.log.info(
        {
          callSid,
          code,
          reason: reason.toString(),
        },
        'OpenAI WebSocket closed'
      );
      metrics.track('openai_disconnected');
    });
  });
}
