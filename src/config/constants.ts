export const AUDIO_FORMATS = {
  TWILIO_SAMPLE_RATE: 8000,
  TWILIO_ENCODING: 'mulaw',
  OPENAI_SAMPLE_RATE: 24000,
  OPENAI_ENCODING: 'pcm16',
} as const;

export const WEBSOCKET_EVENTS = {
  TWILIO: {
    START: 'start',
    MEDIA: 'media',
    STOP: 'stop',
    MARK: 'mark',
  },
  OPENAI: {
    SESSION_UPDATE: 'session.update',
    INPUT_AUDIO_BUFFER_APPEND: 'input_audio_buffer.append',
    RESPONSE_CREATE: 'response.create',
    RESPONSE_AUDIO_DELTA: 'response.audio.delta',
    RESPONSE_AUDIO_DONE: 'response.audio.done',
    ERROR: 'error',
  },
} as const;

export const METRICS_EVENTS = {
  CALL_START: 'call_start',
  CALL_END: 'call_end',
  AUDIO_RECEIVED: 'audio_received',
  AUDIO_SENT: 'audio_sent',
  KNOWLEDGE_SEARCH: 'knowledge_search',
  FUNCTION_CALL: 'function_call',
  ERROR: 'error',
} as const;

export const RESPONSE_MESSAGES = {
  HEALTH_OK: 'Service is healthy',
  SERVICE_STARTING: 'Voice AI Agent service starting...',
  SERVICE_READY: 'Voice AI Agent service ready',
  SHUTDOWN_INITIATED: 'Shutdown initiated',
} as const;

export const ERROR_MESSAGES = {
  ENV_VALIDATION_FAILED: 'Environment validation failed',
  DB_CONNECTION_FAILED: 'Database connection failed',
  WEBSOCKET_ERROR: 'WebSocket connection error',
  AUDIO_CONVERSION_ERROR: 'Audio conversion error',
  KNOWLEDGE_SEARCH_ERROR: 'Knowledge search error',
} as const;
