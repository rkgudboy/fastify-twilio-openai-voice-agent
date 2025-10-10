import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Twilio Configuration
  TWILIO_ACCOUNT_SID: z.string().min(1, 'Twilio Account SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'Twilio Auth Token is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'Twilio Phone Number is required'),

  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-realtime-preview-2024-10-01'),

  // MongoDB Configuration
  MONGODB_URI: z.string().default('mongodb://localhost:27017/voice-ai-agent'),
  MONGODB_DB_NAME: z.string().default('voice-ai-agent'),

  // ChromaDB Configuration
  CHROMA_URL: z.string().default('http://localhost:8000'),
  CHROMA_COLLECTION_NAME: z.string().default('customer_service_kb'),

  // Logging Configuration
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Optional Security
  API_KEY: z.string().optional(),

  // Server Configuration
  MAX_CONCURRENT_CALLS: z.string().transform(Number).default('100'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = getEnv();
