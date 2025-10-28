/**
 * WebSocket Connection Manager
 * Manages Twilio media streaming and call orchestration
 */

import { CallSession } from './session.js';
import audioProcessor from '../utils/audio-processor.js';
import openaiService from '../services/openai.service.js';
import mongodbService from '../services/mongodb.service.js';
import chromadbService from '../services/chromadb.service.js';
import { tools, executeTool } from '../functions/tools.js';
import config from '../config/config.js';

class ConnectionManager {
  constructor() {
    this.activeSessions = new Map();
    this.websockets = new Map();
  }

  /**
   * Accept WebSocket connection and create session
   */
  async connect(websocket, callSid) {
    this.websockets.set(callSid, websocket);
    this.activeSessions.set(callSid, new CallSession(callSid));
    console.log(`Session created for call: ${callSid}`);
  }

  /**
   * Close WebSocket and cleanup session
   */
  async disconnect(callSid) {
    if (this.websockets.has(callSid)) {
      this.websockets.delete(callSid);
    }
    if (this.activeSessions.has(callSid)) {
      this.activeSessions.delete(callSid);
    }

    // Mark call as completed in database
    await mongodbService.endCallSession(callSid);
    console.log(`Session closed for call: ${callSid}`);
  }

  /**
   * Get session by call SID
   */
  getSession(callSid) {
    return this.activeSessions.get(callSid);
  }

  /**
   * Send audio to Twilio via WebSocket
   */
  async sendAudio(websocket, audioData, streamSid) {
    try {
      // Encode audio to base64
      const audioBase64 = audioProcessor.encodeBase64Audio(audioData);

      // Send as Twilio media message
      const message = {
        event: 'media',
        streamSid: streamSid,
        media: {
          payload: audioBase64
        }
      };

      websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending audio:', error);
    }
  }

  /**
   * Main handler for media streaming
   * Processes incoming audio and generates responses
   */
  async handleMediaStream(websocket, callSid) {
    const session = this.getSession(callSid);
    if (!session) {
      console.error(`No session found for call: ${callSid}`);
      return;
    }

    try {
      // Send initial greeting
      await this._sendGreeting(websocket, session);

      // Main message processing loop
      websocket.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const event = message.event;

          if (event === 'start') {
            await this._handleStart(message, session);
          } else if (event === 'media') {
            await this._handleMedia(message, session, websocket);
          } else if (event === 'stop') {
            await this._handleStop(message, session);
          }
        } catch (error) {
          console.error(`Error processing message for call ${callSid}:`, error);
        }
      });

      websocket.on('close', async () => {
        console.log(`WebSocket closed for call: ${callSid}`);
        await this.disconnect(callSid);
      });

      websocket.on('error', (error) => {
        console.error(`WebSocket error for call ${callSid}:`, error);
      });
    } catch (error) {
      console.error('Error in media stream handler:', error);
      throw error;
    }
  }

  /**
   * Handle start event
   */
  async _handleStart(message, session) {
    const startData = message.start || {};
    session.setStreamSid(startData.streamSid);

    console.log(`Stream started: ${session.streamSid} for call: ${session.callSid}`);
  }

  /**
   * Handle incoming media (audio) event
   */
  async _handleMedia(message, session, websocket) {
    try {
      // Extract audio payload
      const media = message.media || {};
      const audioBase64 = media.payload;

      if (!audioBase64) {
        return;
      }

      // Decode audio (mulaw format from Twilio)
      const mulawAudio = audioProcessor.decodeBase64Audio(audioBase64);

      // Convert mulaw to PCM
      const pcmAudio = audioProcessor.mulawToPcm(mulawAudio);

      // Add to buffer
      session.audioBuffer.addChunk(pcmAudio);

      // Check voice activity
      const timestamp = Date.now() / 1000; // seconds
      const { isSpeaking, speechEnded } = session.vad.processChunk(pcmAudio, timestamp);

      // If speech ended and not already processing, process the audio
      if (speechEnded && !session.isProcessing) {
        await this._processSpeech(session, websocket);
      }

      // Check for maximum recording duration
      const bufferDuration = session.audioBuffer.duration();
      if (bufferDuration > config.audio.maxRecordingDuration) {
        console.warn(`Max recording duration exceeded for call: ${session.callSid}`);
        await this._processSpeech(session, websocket);
      }
    } catch (error) {
      console.error('Error handling media:', error);
    }
  }

  /**
   * Handle stop event
   */
  async _handleStop(message, session) {
    console.log(`Stream stopped for call: ${session.callSid}`);
  }

  /**
   * Send initial greeting to caller
   */
  async _sendGreeting(websocket, session) {
    try {
      const greetingText = 'Hello! How can I help you today?';

      // Add to conversation history
      session.addToHistory('assistant', greetingText);

      // Store in database
      await mongodbService.addMessageToTranscript(
        session.callSid,
        'assistant',
        greetingText
      );

      // Convert to speech (mulaw format for Twilio)
      const audioData = await openaiService.textToSpeech(greetingText, null, 'mulaw');

      // Send audio to caller
      if (session.streamSid) {
        await this.sendAudio(websocket, audioData, session.streamSid);
      }

      console.log(`Greeting sent for call: ${session.callSid}`);
    } catch (error) {
      console.error('Error sending greeting:', error);
    }
  }

  /**
   * Process accumulated speech:
   * 1. Transcribe audio
   * 2. Search knowledge base
   * 3. Generate response (with function calling if needed)
   * 4. Convert to speech
   * 5. Send back to caller
   */
  async _processSpeech(session, websocket) {
    if (session.isProcessing || session.audioBuffer.isEmpty()) {
      return;
    }

    session.startProcessing();

    try {
      // Get audio from buffer
      const audioData = session.audioBuffer.getAudio();
      session.audioBuffer.clear();

      console.log(
        `Processing speech for call: ${session.callSid}, ${audioData.length} bytes`
      );

      // Convert PCM to WAV for Whisper
      const wavAudio = audioProcessor.pcmToWav(audioData);

      // Step 1: Transcribe with Whisper
      const transcript = await openaiService.transcribeAudio(wavAudio);
      console.log(`Transcript: ${transcript}`);

      // Add to conversation history
      session.addToHistory('user', transcript);

      // Store in database
      await mongodbService.addMessageToTranscript(
        session.callSid,
        'user',
        transcript
      );

      // Step 2: Search knowledge base for context
      const context = await chromadbService.getContextForQuery(transcript, 3, 0.7);

      // Step 3: Generate response with GPT-4 (including function calling)
      const responseText = await openaiService.generateWithTools(
        transcript,
        context,
        session.getHistoryForAPI(),
        tools,
        executeTool
      );

      console.log(`Response: ${responseText}`);

      // Add to conversation history
      session.addToHistory('assistant', responseText);

      // Store in database
      await mongodbService.addMessageToTranscript(
        session.callSid,
        'assistant',
        responseText
      );

      // Step 4: Convert response to speech (mulaw for Twilio)
      const audioResponse = await openaiService.textToSpeech(
        responseText,
        null,
        'mulaw'
      );

      // Step 5: Send audio back to caller
      if (session.streamSid) {
        await this.sendAudio(websocket, audioResponse, session.streamSid);
      }

      console.log(`Response sent for call: ${session.callSid}`);
    } catch (error) {
      console.error('Error processing speech:', error);

      // Send error message to user
      const errorText = "I'm sorry, I didn't catch that. Could you please repeat?";
      try {
        const audioError = await openaiService.textToSpeech(errorText, null, 'mulaw');
        if (session.streamSid) {
          await this.sendAudio(websocket, audioError, session.streamSid);
        }
      } catch (err) {
        console.error('Error sending error message:', err);
      }
    } finally {
      session.stopProcessing();
      // Reset VAD
      session.vad.reset();
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount() {
    return this.activeSessions.size;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds() {
    return Array.from(this.activeSessions.keys());
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();

export default connectionManager;
