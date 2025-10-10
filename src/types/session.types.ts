import type { WebSocket } from 'ws';
import type { MetricsCollector } from './metrics.types.js';

export interface CallSession {
  callSid: string;
  streamSid: string;
  twilioWs: WebSocket;
  openaiWs: WebSocket | null;
  metrics: MetricsCollector;
  status: 'connecting' | 'active' | 'closing' | 'closed';
  createdAt: number;
  updatedAt: number;
  caller?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionStore {
  get(callSid: string): CallSession | undefined;
  set(callSid: string, session: CallSession): void;
  delete(callSid: string): boolean;
  getAll(): CallSession[];
  getActive(): CallSession[];
  size(): number;
}

export interface TwilioMediaStreamMessage {
  event: 'start' | 'media' | 'stop' | 'mark';
  sequenceNumber?: string;
  streamSid?: string;
  start?: {
    streamSid: string;
    callSid: string;
    accountSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  media?: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  mark?: {
    name: string;
  };
}
