import type { CallSession, SessionStore } from '../types/session.types.js';
import { logger } from '../utils/logger.js';

/**
 * Session manager service
 * Manages active call sessions in memory
 */
class SessionManagerService implements SessionStore {
  private sessions = new Map<string, CallSession>();

  /**
   * Get a session by call SID
   */
  get(callSid: string): CallSession | undefined {
    return this.sessions.get(callSid);
  }

  /**
   * Create or update a session
   */
  set(callSid: string, session: CallSession): void {
    this.sessions.set(callSid, {
      ...session,
      updatedAt: Date.now(),
    });
    logger.info(
      {
        callSid,
        status: session.status,
        caller: session.caller,
      },
      'Session updated'
    );
  }

  /**
   * Delete a session and cleanup resources
   */
  delete(callSid: string): boolean {
    const session = this.sessions.get(callSid);
    if (session) {
      // Update status
      session.status = 'closed';

      // Close WebSocket connections
      try {
        if (session.twilioWs && session.twilioWs.readyState === 1) {
          session.twilioWs.close();
        }
      } catch (error) {
        logger.warn({ error, callSid }, 'Error closing Twilio WebSocket');
      }

      try {
        if (session.openaiWs && session.openaiWs.readyState === 1) {
          session.openaiWs.close();
        }
      } catch (error) {
        logger.warn({ error, callSid }, 'Error closing OpenAI WebSocket');
      }

      // Remove from map
      this.sessions.delete(callSid);

      logger.info({ callSid }, 'Session deleted and cleaned up');
      return true;
    }
    return false;
  }

  /**
   * Get all sessions
   */
  getAll(): CallSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get only active sessions
   */
  getActive(): CallSession[] {
    return this.getAll().filter((s) => s.status === 'active');
  }

  /**
   * Get the count of sessions
   */
  size(): number {
    return this.sessions.size;
  }

  /**
   * Update session status
   */
  updateStatus(callSid: string, status: CallSession['status']): boolean {
    const session = this.sessions.get(callSid);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
      this.sessions.set(callSid, session);
      logger.debug({ callSid, status }, 'Session status updated');
      return true;
    }
    return false;
  }

  /**
   * Cleanup stale sessions (older than timeout)
   */
  cleanupStale(timeoutMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [callSid, session] of this.sessions.entries()) {
      const age = now - session.updatedAt;
      if (age > timeoutMs && session.status !== 'active') {
        this.delete(callSid);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned, timeoutMs }, 'Cleaned up stale sessions');
    }

    return cleaned;
  }

  /**
   * Get session statistics
   */
  getStats() {
    const all = this.getAll();
    const byStatus = all.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: all.length,
      active: this.getActive().length,
      byStatus,
    };
  }
}

export const sessionManagerService = new SessionManagerService();
