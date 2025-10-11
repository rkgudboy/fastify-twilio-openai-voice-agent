/**
 * Audio utility functions for converting between different audio formats
 * Twilio uses mulaw 8kHz, OpenAI uses PCM16 24kHz
 */

import { AUDIO_FORMATS } from '../config/constants.js';

/**
 * Convert mulaw audio to PCM16
 * @param mulawData - Base64 encoded mulaw audio data
 * @returns PCM16 audio data as Int16Array
 */
export function mulawToPcm16(mulawData: string): Int16Array {
  const mulawBytes = Buffer.from(mulawData, 'base64');
  const pcm16 = new Int16Array(mulawBytes.length);

  for (let i = 0; i < mulawBytes.length; i++) {
    pcm16[i] = mulawDecode(mulawBytes[i]);
  }

  return pcm16;
}

/**
 * Decode a single mulaw byte to PCM16 sample
 * @param mulawByte - mulaw encoded byte
 * @returns PCM16 sample value
 */
function mulawDecode(mulawByte: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;

  mulawByte = ~mulawByte;
  const sign = mulawByte & 0x80;
  const exponent = (mulawByte >> 4) & 0x07;
  const mantissa = mulawByte & 0x0f;

  let sample = mantissa << (exponent + 3);
  sample += BIAS;
  if (exponent === 0) {
    sample += BIAS;
  }

  if (sign !== 0) {
    sample = -sample;
  }

  return Math.max(-CLIP, Math.min(CLIP, sample));
}

/**
 * Convert PCM16 to mulaw
 * @param pcm16Data - PCM16 audio data as Int16Array
 * @returns Base64 encoded mulaw audio data
 */
export function pcm16ToMulaw(pcm16Data: Int16Array): string {
  const mulawBytes = Buffer.alloc(pcm16Data.length);

  for (let i = 0; i < pcm16Data.length; i++) {
    mulawBytes[i] = mulawEncode(pcm16Data[i]);
  }

  return mulawBytes.toString('base64');
}

/**
 * Encode a single PCM16 sample to mulaw byte
 * Based on ITU-T G.711 specification
 * @param pcm16Sample - PCM16 sample value (-32768 to 32767)
 * @returns mulaw encoded byte (0-255)
 */
function mulawEncode(pcm16Sample: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;
  const EXP_LUT = [0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,
                   4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
                   5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
                   5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
                   6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
                   6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
                   6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
                   6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7,
                   7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7];

  // Get sign and absolute value
  let sign: number;
  let sample: number;

  // Clip sample to valid range
  sample = Math.max(-CLIP, Math.min(CLIP, pcm16Sample));

  // Get sign bit
  if (sample < 0) {
    sign = 0x80;
    sample = -sample;
  } else {
    sign = 0;
  }

  // Add bias
  sample += BIAS;

  // Find exponent using lookup table
  let exponent: number;
  if (sample > 32767) {
    sample = 32767;
  }

  exponent = EXP_LUT[(sample >> 7) & 0xff];

  // Extract mantissa (4 bits)
  const mantissa = (sample >> (exponent + 3)) & 0x0f;

  // Compose mulaw byte: complement of (sign | exponent | mantissa)
  const mulawByte = ~(sign | (exponent << 4) | mantissa);

  return mulawByte & 0xff;
}

/**
 * Apply a simple low-pass filter to reduce aliasing before downsampling
 * Uses a moving average filter (simple FIR filter)
 * @param audioData - Input audio data
 * @param cutoffRatio - Cutoff frequency ratio (0-1), typically 0.5 for downsampling
 * @returns Filtered audio data
 */
function lowPassFilter(audioData: Int16Array, cutoffRatio: number = 0.5): Int16Array {
  // Calculate window size based on cutoff ratio
  // For 3:1 downsampling, we want to remove frequencies above Nyquist of target rate
  const windowSize = Math.max(3, Math.floor(1 / cutoffRatio));
  const output = new Int16Array(audioData.length);

  for (let i = 0; i < audioData.length; i++) {
    let sum = 0;
    let count = 0;

    // Average samples in the window
    const halfWindow = Math.floor(windowSize / 2);
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < audioData.length) {
        sum += audioData[idx];
        count++;
      }
    }

    output[i] = Math.round(sum / count);
  }

  return output;
}

/**
 * Resample audio from one sample rate to another
 * Uses cubic interpolation with anti-aliasing filter for better quality
 * @param audioData - Input audio data
 * @param fromRate - Source sample rate
 * @param toRate - Target sample rate
 * @returns Resampled audio data
 */
export function resampleAudio(
  audioData: Int16Array,
  fromRate: number,
  toRate: number
): Int16Array {
  if (fromRate === toRate) {
    return audioData;
  }

  // Apply anti-aliasing filter when downsampling
  let filteredData = audioData;
  if (fromRate > toRate) {
    const cutoffRatio = toRate / fromRate;
    filteredData = lowPassFilter(audioData, cutoffRatio);
  }

  const ratio = fromRate / toRate;
  const outputLength = Math.floor(filteredData.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const fraction = srcIndex - srcIndexFloor;

    // Cubic interpolation for better quality
    const x0 = Math.max(0, srcIndexFloor - 1);
    const x1 = srcIndexFloor;
    const x2 = Math.min(filteredData.length - 1, srcIndexFloor + 1);
    const x3 = Math.min(filteredData.length - 1, srcIndexFloor + 2);

    const v0 = filteredData[x0];
    const v1 = filteredData[x1];
    const v2 = filteredData[x2];
    const v3 = filteredData[x3];

    // Catmull-Rom spline interpolation
    const a = -0.5 * v0 + 1.5 * v1 - 1.5 * v2 + 0.5 * v3;
    const b = v0 - 2.5 * v1 + 2 * v2 - 0.5 * v3;
    const c = -0.5 * v0 + 0.5 * v2;
    const d = v1;

    const value = a * fraction * fraction * fraction +
                  b * fraction * fraction +
                  c * fraction +
                  d;

    // Clamp to valid 16-bit range
    output[i] = Math.max(-32768, Math.min(32767, Math.round(value)));
  }

  return output;
}

/**
 * Convert Twilio mulaw audio to OpenAI PCM16 format
 * @param twilioAudio - Base64 encoded mulaw audio from Twilio
 * @returns Base64 encoded PCM16 audio for OpenAI
 */
export function twilioToOpenAI(twilioAudio: string): string {
  // Validate input
  if (!twilioAudio || twilioAudio.length === 0) {
    throw new Error('Invalid audio data: empty or null');
  }

  try {
    // Decode mulaw to PCM16
    const pcm16_8khz = mulawToPcm16(twilioAudio);

    // Validate we have samples
    if (pcm16_8khz.length === 0) {
      throw new Error('Invalid audio data: no samples after mulaw decode');
    }

    // Resample from 8kHz to 24kHz
    const pcm16_24khz = resampleAudio(
      pcm16_8khz,
      AUDIO_FORMATS.TWILIO_SAMPLE_RATE,
      AUDIO_FORMATS.OPENAI_SAMPLE_RATE
    );

    // Validate resampled output
    if (pcm16_24khz.length === 0) {
      throw new Error('Invalid audio data: no samples after resampling');
    }

    // Convert to base64
    const buffer = Buffer.from(pcm16_24khz.buffer);
    return buffer.toString('base64');
  } catch (error) {
    throw new Error(`Audio conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert OpenAI PCM16 audio to Twilio mulaw format
 * @param openaiAudio - Base64 encoded PCM16 audio from OpenAI
 * @returns Base64 encoded mulaw audio for Twilio
 * @deprecated This function is no longer needed when using g711_ulaw output format
 */
export function openaiToTwilio(openaiAudio: string): string {
  // Validate input
  if (!openaiAudio || openaiAudio.length === 0) {
    throw new Error('Invalid audio data: empty or null');
  }

  // Decode base64 to PCM16
  const buffer = Buffer.from(openaiAudio, 'base64');

  // Validate buffer length is even (required for Int16Array)
  if (buffer.length % 2 !== 0) {
    throw new Error('Invalid audio buffer: length must be even for 16-bit samples');
  }

  const pcm16_24khz = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

  // Validate we have samples
  if (pcm16_24khz.length === 0) {
    throw new Error('Invalid audio data: no samples found');
  }

  // Resample from 24kHz to 8kHz
  const pcm16_8khz = resampleAudio(
    pcm16_24khz,
    AUDIO_FORMATS.OPENAI_SAMPLE_RATE,
    AUDIO_FORMATS.TWILIO_SAMPLE_RATE
  );

  // Encode to mulaw
  return pcm16ToMulaw(pcm16_8khz);
}
