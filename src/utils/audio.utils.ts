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
 * @param pcm16Sample - PCM16 sample value
 * @returns mulaw encoded byte
 */
function mulawEncode(pcm16Sample: number): number {
  const BIAS = 0x84;
  const CLIP = 32635;

  let sign: number;
  let exponent: number;
  let mantissa: number;
  let sample: number;

  sample = Math.max(-CLIP, Math.min(CLIP, pcm16Sample));

  if (sample >= 0) {
    sign = 0x80;
    sample += BIAS;
  } else {
    sign = 0;
    sample = BIAS - sample;
  }

  exponent = 7;
  for (let exp_lut = 256; exp_lut > 0; exp_lut >>= 1) {
    if (sample >= exp_lut) {
      sample >>= 1;
    } else {
      exponent--;
    }
  }

  mantissa = (sample >> (exponent + 3)) & 0x0f;

  const mulawByte = ~(sign | (exponent << 4) | mantissa);
  return mulawByte & 0xff;
}

/**
 * Resample audio from one sample rate to another
 * Simple linear interpolation resampling
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

  const ratio = fromRate / toRate;
  const outputLength = Math.floor(audioData.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    output[i] = Math.round(
      audioData[srcIndexFloor] * (1 - fraction) + audioData[srcIndexCeil] * fraction
    );
  }

  return output;
}

/**
 * Convert Twilio mulaw audio to OpenAI PCM16 format
 * @param twilioAudio - Base64 encoded mulaw audio from Twilio
 * @returns Base64 encoded PCM16 audio for OpenAI
 */
export function twilioToOpenAI(twilioAudio: string): string {
  // Decode mulaw to PCM16
  const pcm16_8khz = mulawToPcm16(twilioAudio);

  // Resample from 8kHz to 24kHz
  const pcm16_24khz = resampleAudio(
    pcm16_8khz,
    AUDIO_FORMATS.TWILIO_SAMPLE_RATE,
    AUDIO_FORMATS.OPENAI_SAMPLE_RATE
  );

  // Convert to base64
  const buffer = Buffer.from(pcm16_24khz.buffer);
  return buffer.toString('base64');
}

/**
 * Convert OpenAI PCM16 audio to Twilio mulaw format
 * @param openaiAudio - Base64 encoded PCM16 audio from OpenAI
 * @returns Base64 encoded mulaw audio for Twilio
 */
export function openaiToTwilio(openaiAudio: string): string {
  // Decode base64 to PCM16
  const buffer = Buffer.from(openaiAudio, 'base64');
  const pcm16_24khz = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);

  // Resample from 24kHz to 8kHz
  const pcm16_8khz = resampleAudio(
    pcm16_24khz,
    AUDIO_FORMATS.OPENAI_SAMPLE_RATE,
    AUDIO_FORMATS.TWILIO_SAMPLE_RATE
  );

  // Encode to mulaw
  return pcm16ToMulaw(pcm16_8khz);
}
