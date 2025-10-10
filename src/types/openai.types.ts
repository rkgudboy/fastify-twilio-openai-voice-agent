export interface OpenAIRealtimeConfig {
  model: string;
  apiKey: string;
  voice?: 'alloy' | 'echo' | 'shimmer';
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAISessionConfig {
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
  tools?: OpenAITool[];
}

export interface OpenAITool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface OpenAIRealtimeMessage {
  type: string;
  event_id?: string;
  session?: Partial<OpenAISessionConfig>;
  response?: unknown;
  delta?: string;
  audio?: string;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  error?: {
    type: string;
    code: string;
    message: string;
  };
}

export interface FunctionCallResult {
  toolCallId: string;
  output: string;
}
