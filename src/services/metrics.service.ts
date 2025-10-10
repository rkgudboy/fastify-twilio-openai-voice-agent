import { MetricsCollector, CallEvent, CallSummary, SystemMetrics } from '../types/metrics.types.js';
import { logger } from '../utils/logger.js';

/**
 * Metrics collector for individual calls
 */
class CallMetrics implements MetricsCollector {
  private callSid: string;
  private events: CallEvent[] = [];
  private startTime: number;

  constructor(callSid: string) {
    this.callSid = callSid;
    this.startTime = Date.now();
  }

  track(event: string, metadata?: Record<string, unknown>): void {
    this.events.push({
      event,
      timestamp: Date.now(),
      metadata,
    });
  }

  getLatency(startEvent: string, endEvent: string): number | null {
    const start = this.events.find((e) => e.event === startEvent);
    const end = this.events.find((e) => e.event === endEvent);

    if (start && end) {
      return end.timestamp - start.timestamp;
    }
    return null;
  }

  getSummary(): CallSummary {
    const audioReceived = this.events.filter((e) => e.event === 'audio_received').length;
    const audioSent = this.events.filter((e) => e.event === 'audio_sent').length;
    const knowledgeSearches = this.events.filter((e) => e.event === 'knowledge_search').length;
    const functionCalls = this.events.filter((e) => e.event === 'function_call').length;
    const errors = this.events.filter((e) => e.event === 'error').length;

    return {
      callSid: this.callSid,
      duration: Date.now() - this.startTime,
      totalRoundTrip: this.getLatency('audio_end', 'audio_play_start'),
      events: this.events,
      audioPacketsReceived: audioReceived,
      audioPacketsSent: audioSent,
      knowledgeSearches,
      functionCalls,
      errors,
    };
  }
}

/**
 * Global metrics service
 */
class MetricsService {
  private activeCalls = new Map<string, CallMetrics>();
  private completedCalls: CallSummary[] = [];
  private readonly maxStoredCalls = 1000;

  /**
   * Start tracking metrics for a new call
   */
  startCall(callSid: string): CallMetrics {
    const metrics = new CallMetrics(callSid);
    this.activeCalls.set(callSid, metrics);
    logger.info({ callSid }, 'Started metrics tracking for call');
    return metrics;
  }

  /**
   * End tracking and store metrics for a call
   */
  endCall(callSid: string): void {
    const metrics = this.activeCalls.get(callSid);
    if (metrics) {
      const summary = metrics.getSummary();
      this.completedCalls.push(summary);
      this.activeCalls.delete(callSid);

      // Keep only last N calls
      if (this.completedCalls.length > this.maxStoredCalls) {
        this.completedCalls.shift();
      }

      logger.info(
        {
          callSid,
          duration: summary.duration,
          roundTrip: summary.totalRoundTrip,
        },
        'Ended metrics tracking for call'
      );
    }
  }

  /**
   * Get metrics for an active call
   */
  getCallMetrics(callSid: string): CallMetrics | undefined {
    return this.activeCalls.get(callSid);
  }

  /**
   * Get aggregated system metrics
   */
  getStats(): SystemMetrics {
    const completed = this.completedCalls.slice(-100);

    if (completed.length === 0) {
      return {
        activeCalls: this.activeCalls.size,
        totalCalls: 0,
        avgRoundTripLatency: 0,
        p95RoundTripLatency: 0,
        p99RoundTripLatency: 0,
        avgCallDuration: 0,
        last10Calls: [],
      };
    }

    const roundTrips = completed
      .map((c) => c.totalRoundTrip)
      .filter((rt): rt is number => rt !== null && rt > 0);

    const durations = completed.map((c) => c.duration);

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.ceil(sorted.length * p) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      activeCalls: this.activeCalls.size,
      totalCalls: this.completedCalls.length,
      avgRoundTripLatency: Math.round(avg(roundTrips)),
      p95RoundTripLatency: Math.round(percentile(roundTrips, 0.95)),
      p99RoundTripLatency: Math.round(percentile(roundTrips, 0.99)),
      avgCallDuration: Math.round(avg(durations)),
      last10Calls: completed.slice(-10).map((c) => ({
        callSid: c.callSid,
        duration: c.duration,
        roundTrip: c.totalRoundTrip,
        timestamp: Date.now() - c.duration,
      })),
    };
  }

  /**
   * Get total number of calls processed
   */
  getTotalCalls(): number {
    return this.completedCalls.length;
  }

  /**
   * Get number of active calls
   */
  getActiveCalls(): number {
    return this.activeCalls.size;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.activeCalls.clear();
    this.completedCalls = [];
    logger.warn('Metrics have been reset');
  }
}

export const metricsService = new MetricsService();
