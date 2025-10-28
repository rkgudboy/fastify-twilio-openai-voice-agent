/**
 * Configuration settings for Voice AI Agent
 * Loads from environment variables
 */

import dotenv from 'dotenv';

dotenv.config();

const config = {
  // API Information
  app: {
    name: process.env.APP_NAME || 'Voice AI Agent',
    version: process.env.APP_VERSION || '1.0.0',
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS || '*'
  },

  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
    ttsVoice: process.env.OPENAI_TTS_VOICE || 'alloy',
    whisperModel: process.env.OPENAI_WHISPER_MODEL || 'whisper-1',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
  },

  // MongoDB Configuration
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'voice_agent_db',
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 1
  },

  // ChromaDB Configuration
  chromadb: {
    url: process.env.CHROMADB_URL || 'http://localhost:8000',
    collectionName: process.env.CHROMADB_COLLECTION_NAME || 'knowledge_base'
  },

  // Audio Processing Configuration
  audio: {
    sampleRate: parseInt(process.env.SAMPLE_RATE) || 8000,
    chunkSize: parseInt(process.env.AUDIO_CHUNK_SIZE) || 1024,
    vadThreshold: parseFloat(process.env.VAD_THRESHOLD) || 0.5,
    silenceDuration: parseFloat(process.env.SILENCE_DURATION) || 1.5,
    maxRecordingDuration: parseInt(process.env.MAX_RECORDING_DURATION) || 30
  },

  // Session Configuration
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT) || 3600,
    maxSessions: parseInt(process.env.MAX_SESSIONS) || 1000
  },

  // Performance Settings
  performance: {
    maxWorkers: parseInt(process.env.MAX_WORKERS) || 4,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate required configuration
function validateConfig() {
  const required = [
    'twilio.accountSid',
    'twilio.authToken',
    'twilio.phoneNumber',
    'openai.apiKey',
    'mongodb.url'
  ];

  const missing = [];

  for (const key of required) {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
    }
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`Warning: Missing required configuration: ${missing.join(', ')}`);
  }
}

validateConfig();

export default config;
