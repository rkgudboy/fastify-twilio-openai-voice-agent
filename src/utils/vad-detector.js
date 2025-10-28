/**
 * Voice Activity Detection (VAD)
 * Threshold-based detection using RMS energy
 */

import config from '../config/config.js';
import audioProcessor from './audio-processor.js';

class VoiceActivityDetector {
  constructor() {
    this.threshold = config.audio.vadThreshold;
    this.silenceDuration = config.audio.silenceDuration;
    this.isSpeaking = false;
    this.lastSpeechTime = null;
    this.silenceStartTime = null;
  }

  /**
   * Process audio chunk and detect speech activity
   * @param {Buffer} pcmChunk - PCM16 audio chunk
   * @param {number} timestamp - Current timestamp in seconds
   * @returns {{isSpeaking: boolean, speechEnded: boolean}} Detection results
   */
  processChunk(pcmChunk, timestamp) {
    // Calculate energy of the chunk
    const rms = audioProcessor.calculateRMS(pcmChunk);
    const normalizedEnergy = audioProcessor.normalizeEnergy(rms);

    const isSpeech = normalizedEnergy > this.threshold;

    let speechEnded = false;

    if (isSpeech) {
      // Speech detected
      if (!this.isSpeaking) {
        // Start of speech
        this.isSpeaking = true;
        this.silenceStartTime = null;
      }
      this.lastSpeechTime = timestamp;
    } else {
      // Silence detected
      if (this.isSpeaking) {
        // Currently speaking, but silence detected
        if (this.silenceStartTime === null) {
          this.silenceStartTime = timestamp;
        }

        const silenceDuration = timestamp - this.silenceStartTime;

        if (silenceDuration >= this.silenceDuration) {
          // Silence duration threshold reached
          speechEnded = true;
          this.isSpeaking = false;
        }
      }
    }

    return {
      isSpeaking: this.isSpeaking,
      speechEnded: speechEnded
    };
  }

  /**
   * Reset VAD state
   */
  reset() {
    this.isSpeaking = false;
    this.lastSpeechTime = null;
    this.silenceStartTime = null;
  }

  /**
   * Set VAD threshold
   * @param {number} threshold - Threshold value (0-1)
   */
  setThreshold(threshold) {
    this.threshold = threshold;
  }

  /**
   * Set silence duration
   * @param {number} duration - Duration in seconds
   */
  setSilenceDuration(duration) {
    this.silenceDuration = duration;
  }

  /**
   * Get current state
   * @returns {{isSpeaking: boolean, threshold: number, silenceDuration: number}}
   */
  getState() {
    return {
      isSpeaking: this.isSpeaking,
      threshold: this.threshold,
      silenceDuration: this.silenceDuration
    };
  }
}

export default VoiceActivityDetector;
