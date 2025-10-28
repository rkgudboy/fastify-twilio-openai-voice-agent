/**
 * WebSocket Session Management
 * Handles audio buffering and call session state
 */

import audioProcessor from '../utils/audio-processor.js';
import VoiceActivityDetector from '../utils/vad-detector.js';

/**
 * Audio Buffer for accumulating audio chunks
 */
export class AudioBuffer {
  constructor() {
    this.chunks = [];
    this.startTime = null;
    this.lastChunkTime = null;
  }

  /**
   * Add audio chunk to buffer
   */
  addChunk(chunk) {
    if (this.startTime === null) {
      this.startTime = Date.now() / 1000; // seconds
    }
    this.chunks.push(chunk);
    this.lastChunkTime = Date.now() / 1000;
  }

  /**
   * Get concatenated audio data
   */
  getAudio() {
    return audioProcessor.concatenateAudio(this.chunks);
  }

  /**
   * Clear buffer
   */
  clear() {
    this.chunks = [];
    this.startTime = null;
    this.lastChunkTime = null;
  }

  /**
   * Get buffer duration in seconds
   */
  duration() {
    if (this.startTime && this.lastChunkTime) {
      return this.lastChunkTime - this.startTime;
    }
    return 0;
  }

  /**
   * Check if buffer is empty
   */
  isEmpty() {
    return this.chunks.length === 0;
  }

  /**
   * Get number of chunks
   */
  getChunkCount() {
    return this.chunks.length;
  }
}

/**
 * Call Session state management
 */
export class CallSession {
  constructor(callSid) {
    this.callSid = callSid;
    this.audioBuffer = new AudioBuffer();
    this.vad = new VoiceActivityDetector();
    this.conversationHistory = [];
    this.streamSid = null;
    this.isProcessing = false;
    this.createdAt = new Date();
  }

  /**
   * Add message to conversation history
   */
  addToHistory(role, content) {
    this.conversationHistory.push({
      role: role,
      content: content
    });
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Get conversation history formatted for OpenAI (without system messages)
   */
  getHistoryForAPI() {
    return this.conversationHistory.filter(msg => msg.role !== 'system');
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Set stream SID
   */
  setStreamSid(streamSid) {
    this.streamSid = streamSid;
  }

  /**
   * Mark as processing
   */
  startProcessing() {
    this.isProcessing = true;
  }

  /**
   * Mark as not processing
   */
  stopProcessing() {
    this.isProcessing = false;
  }

  /**
   * Get session info
   */
  getInfo() {
    return {
      callSid: this.callSid,
      streamSid: this.streamSid,
      isProcessing: this.isProcessing,
      conversationLength: this.conversationHistory.length,
      bufferDuration: this.audioBuffer.duration(),
      createdAt: this.createdAt
    };
  }
}
