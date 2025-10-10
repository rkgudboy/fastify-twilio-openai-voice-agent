export interface MetricsCollector {
  track(event: string, metadata?: Record<string, unknown>): void;
  getLatency(startEvent: string, endEvent: string): number | null;
  getSummary(): CallSummary;
}

export interface CallEvent {
  event: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface CallSummary {
  callSid: string;
  duration: number;
  totalRoundTrip: number | null;
  events: CallEvent[];
  audioPacketsReceived?: number;
  audioPacketsSent?: number;
  knowledgeSearches?: number;
  functionCalls?: number;
  errors?: number;
}

export interface SystemMetrics {
  activeCalls: number;
  totalCalls: number;
  avgRoundTripLatency: number;
  p95RoundTripLatency: number;
  p99RoundTripLatency: number;
  avgCallDuration: number;
  last10Calls: {
    callSid: string;
    duration: number;
    roundTrip: number | null;
    timestamp: number;
  }[];
}
