/**
 * Audio processing utilities for Voice AI Agent
 * Handles audio format conversion between mulaw, PCM16, and WAV
 */

import config from '../config/config.js';

/**
 * Mulaw encoding/decoding lookup tables
 */
const MULAW_MAX = 0x1FFF;
const MULAW_BIAS = 33;

const exp_lut = [0, 132, 396, 924, 1980, 4092, 8316, 16764];

/**
 * Convert linear PCM16 sample to mulaw
 */
function linearToMulaw(sample) {
  let sign = (sample >> 8) & 0x80;
  if (sign !== 0) sample = -sample;
  if (sample > MULAW_MAX) sample = MULAW_MAX;

  sample = sample + MULAW_BIAS;
  let exponent = 7;
  for (let i = 0; i < 8; i++) {
    if (sample <= exp_lut[i]) {
      exponent = i;
      break;
    }
  }
  let mantissa = (sample >> (exponent + 3)) & 0x0F;
  let mulaw = ~(sign | (exponent << 4) | mantissa);

  return mulaw & 0xFF;
}

/**
 * Convert mulaw sample to linear PCM16
 */
function mulawToLinear(mulawByte) {
  mulawByte = ~mulawByte;
  let sign = mulawByte & 0x80;
  let exponent = (mulawByte >> 4) & 0x07;
  let mantissa = mulawByte & 0x0F;

  let sample = exp_lut[exponent] + (mantissa << (exponent + 3));
  if (sign !== 0) sample = -sample;

  return sample;
}

class AudioProcessor {
  constructor() {
    this.sampleRate = config.audio.sampleRate;
    this.chunkSize = config.audio.chunkSize;
  }

  /**
   * Convert mulaw audio to PCM16 format
   * @param {Buffer} mulawData - Audio data in mulaw format
   * @returns {Buffer} Audio data in PCM16 format (16-bit signed, little-endian)
   */
  mulawToPcm(mulawData) {
    try {
      const pcmBuffer = Buffer.alloc(mulawData.length * 2);

      for (let i = 0; i < mulawData.length; i++) {
        const linear = mulawToLinear(mulawData[i]);
        pcmBuffer.writeInt16LE(linear, i * 2);
      }

      return pcmBuffer;
    } catch (error) {
      console.error('Error converting mulaw to PCM:', error);
      throw error;
    }
  }

  /**
   * Convert PCM16 audio to mulaw format
   * @param {Buffer} pcmData - Audio data in PCM16 format
   * @returns {Buffer} Audio data in mulaw format
   */
  pcmToMulaw(pcmData) {
    try {
      const mulawBuffer = Buffer.alloc(pcmData.length / 2);

      for (let i = 0; i < mulawBuffer.length; i++) {
        const sample = pcmData.readInt16LE(i * 2);
        mulawBuffer[i] = linearToMulaw(sample);
      }

      return mulawBuffer;
    } catch (error) {
      console.error('Error converting PCM to mulaw:', error);
      throw error;
    }
  }

  /**
   * Convert PCM16 audio to WAV format for Whisper API
   * @param {Buffer} pcmData - Audio data in PCM16 format
   * @param {number} sampleRate - Sample rate (default: 8000)
   * @returns {Buffer} WAV file buffer
   */
  pcmToWav(pcmData, sampleRate = null) {
    try {
      sampleRate = sampleRate || this.sampleRate;
      const numChannels = 1; // Mono
      const bitsPerSample = 16;
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      const blockAlign = numChannels * (bitsPerSample / 8);
      const dataSize = pcmData.length;

      // WAV header is 44 bytes
      const wavBuffer = Buffer.alloc(44 + dataSize);

      // RIFF header
      wavBuffer.write('RIFF', 0);
      wavBuffer.writeUInt32LE(36 + dataSize, 4);
      wavBuffer.write('WAVE', 8);

      // fmt chunk
      wavBuffer.write('fmt ', 12);
      wavBuffer.writeUInt32LE(16, 16); // Chunk size
      wavBuffer.writeUInt16LE(1, 20); // Audio format (1 = PCM)
      wavBuffer.writeUInt16LE(numChannels, 22);
      wavBuffer.writeUInt32LE(sampleRate, 24);
      wavBuffer.writeUInt32LE(byteRate, 28);
      wavBuffer.writeUInt16LE(blockAlign, 32);
      wavBuffer.writeUInt16LE(bitsPerSample, 34);

      // data chunk
      wavBuffer.write('data', 36);
      wavBuffer.writeUInt32LE(dataSize, 40);
      pcmData.copy(wavBuffer, 44);

      return wavBuffer;
    } catch (error) {
      console.error('Error converting PCM to WAV:', error);
      throw error;
    }
  }

  /**
   * Concatenate multiple audio chunks
   * @param {Buffer[]} chunks - Array of audio buffers
   * @returns {Buffer} Concatenated audio buffer
   */
  concatenateAudio(chunks) {
    return Buffer.concat(chunks);
  }

  /**
   * Encode audio data to base64 string
   * @param {Buffer} audioData - Audio buffer
   * @returns {string} Base64 encoded string
   */
  encodeBase64Audio(audioData) {
    return audioData.toString('base64');
  }

  /**
   * Decode base64 string to audio data
   * @param {string} audioBase64 - Base64 encoded audio string
   * @returns {Buffer} Audio buffer
   */
  decodeBase64Audio(audioBase64) {
    return Buffer.from(audioBase64, 'base64');
  }

  /**
   * Calculate RMS (Root Mean Square) energy of audio
   * @param {Buffer} pcmData - PCM16 audio data
   * @returns {number} RMS energy value
   */
  calculateRMS(pcmData) {
    let sum = 0;
    const sampleCount = pcmData.length / 2;

    for (let i = 0; i < sampleCount; i++) {
      const sample = pcmData.readInt16LE(i * 2);
      sum += sample * sample;
    }

    return Math.sqrt(sum / sampleCount);
  }

  /**
   * Normalize RMS to 0-1 range
   * @param {number} rms - RMS energy value
   * @returns {number} Normalized energy (0-1)
   */
  normalizeEnergy(rms) {
    const maxAmplitude = 32768; // Max for 16-bit audio
    return Math.min(rms / maxAmplitude, 1.0);
  }
}

// Singleton instance
const audioProcessor = new AudioProcessor();

export default audioProcessor;
