import { env } from './env.js';

export const swaggerConfig = {
  openapi: {
    info: {
      title: 'Voice AI Agent API',
      description: `
# Voice AI Agent System

A production-ready voice AI agent that handles concurrent PSTN calls with real-time AI responses.

## Features
- 🎙️ Real-time voice conversation via Twilio Media Streams
- 🤖 OpenAI GPT-4 Realtime API integration with streaming responses
- 📚 Semantic knowledge base with ChromaDB vector search
- 💾 MongoDB for persistent data storage
- 📊 Built-in metrics and observability
- 🔄 WebSocket-based bidirectional audio streaming
- ⚡ Sub-second response latency with intelligent caching
- 🛡️ Type-safe API with runtime validation

## Architecture
The system uses a multi-layer architecture:
1. **REST API Layer** - Fastify-based HTTP endpoints with Swagger documentation
2. **WebSocket Layer** - Real-time audio streaming between Twilio and OpenAI
3. **Service Layer** - Business logic for knowledge base, sessions, and audio processing
4. **Data Layer** - ChromaDB for vectors, MongoDB for structured data

## Authentication
Some endpoints may require API key authentication via \`X-API-Key\` header.

## Audio Processing
- Input: Twilio Media Streams (mulaw, 8kHz)
- Processing: Real-time conversion to PCM16 24kHz
- Output: OpenAI Realtime API compatible format
      `,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server (update with your domain)',
      },
    ],
    tags: [
      {
        name: 'health',
        description: 'Health check and readiness endpoints',
      },
      {
        name: 'metrics',
        description: 'System metrics and performance monitoring',
      },
      {
        name: 'voice',
        description: 'Voice call management and Twilio webhooks',
      },
      {
        name: 'knowledge',
        description: 'Knowledge base management and semantic search',
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey' as const,
          name: 'X-API-Key',
          in: 'header' as const,
          description: 'API key for authenticated endpoints',
        },
      },
    },
  },
};
