import { Type, Static } from '@sinclair/typebox';

// Health check response schema
export const HealthResponseSchema = Type.Object({
  status: Type.String({ description: 'Service health status' }),
  uptime: Type.Number({ description: 'Server uptime in seconds' }),
  timestamp: Type.String({ description: 'Current server timestamp' }),
  memory: Type.Object({
    rss: Type.Number({ description: 'Resident set size in bytes' }),
    heapTotal: Type.Number({ description: 'Total heap size in bytes' }),
    heapUsed: Type.Number({ description: 'Used heap size in bytes' }),
    external: Type.Number({ description: 'External memory usage in bytes' }),
  }),
  activeCalls: Type.Number({ description: 'Number of active calls' }),
  databases: Type.Optional(Type.Object({
    mongodb: Type.String({ description: 'MongoDB connection status' }),
    chromadb: Type.String({ description: 'ChromaDB connection status' }),
  })),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;

// Readiness check response schema
export const ReadinessResponseSchema = Type.Object({
  ready: Type.Boolean({ description: 'Whether service is ready to accept traffic' }),
  checks: Type.Optional(Type.Object({
    mongodb: Type.Boolean(),
    chromadb: Type.Boolean(),
    openai: Type.Boolean(),
  })),
});

export type ReadinessResponse = Static<typeof ReadinessResponseSchema>;

// Metrics response schema
export const MetricsResponseSchema = Type.Object({
  activeCalls: Type.Number({ description: 'Current number of active calls' }),
  totalCalls: Type.Number({ description: 'Total calls processed since startup' }),
  avgRoundTripLatency: Type.Number({ description: 'Average round-trip latency in ms' }),
  p95RoundTripLatency: Type.Number({ description: '95th percentile latency in ms' }),
  p99RoundTripLatency: Type.Number({ description: '99th percentile latency in ms' }),
  avgCallDuration: Type.Number({ description: 'Average call duration in seconds' }),
  last10Calls: Type.Array(Type.Object({
    callSid: Type.String(),
    duration: Type.Number({ description: 'Call duration in ms' }),
    roundTrip: Type.Union([Type.Number(), Type.Null()]),
    timestamp: Type.Number({ description: 'Unix timestamp' }),
  })),
});

export type MetricsResponse = Static<typeof MetricsResponseSchema>;

// Knowledge document schema
export const KnowledgeDocumentSchema = Type.Object({
  id: Type.String({ description: 'Unique document identifier' }),
  title: Type.String({ description: 'Document title' }),
  text: Type.String({ description: 'Document text content' }),
  category: Type.String({ description: 'Document category' }),
  priority: Type.Optional(Type.Union([
    Type.Literal('low'),
    Type.Literal('normal'),
    Type.Literal('high')
  ], { description: 'Document priority level' })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type KnowledgeDocumentType = Static<typeof KnowledgeDocumentSchema>;

// Search request schema
export const SearchRequestSchema = Type.Object({
  query: Type.String({ minLength: 1, description: 'Search query text' }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 10, default: 3, description: 'Max results to return' })),
});

export type SearchRequest = Static<typeof SearchRequestSchema>;

// Search result schema
export const SearchResultSchema = Type.Object({
  results: Type.Array(Type.Object({
    text: Type.String({ description: 'Matched document text' }),
    score: Type.Number({ description: 'Similarity score (0-1)' }),
    metadata: Type.Record(Type.String(), Type.Unknown()),
  })),
  query: Type.String({ description: 'Original search query' }),
  count: Type.Number({ description: 'Number of results returned' }),
});

export type SearchResultType = Static<typeof SearchResultSchema>;

// Index request schema
export const IndexRequestSchema = Type.Object({
  documents: Type.Array(KnowledgeDocumentSchema, { minItems: 1, description: 'Documents to index' }),
});

export type IndexRequest = Static<typeof IndexRequestSchema>;

// Generic success response
export const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
});

export type SuccessResponse = Static<typeof SuccessResponseSchema>;

// Error response schema
export const ErrorResponseSchema = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  message: Type.String(),
});

export type ErrorResponse = Static<typeof ErrorResponseSchema>;
