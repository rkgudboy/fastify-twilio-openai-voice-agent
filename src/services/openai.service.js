/**
 * OpenAI Service
 * Handles Speech-to-Text (Whisper), Language Model (GPT-4o), and Text-to-Speech (TTS)
 */

import OpenAI from 'openai';
import config from '../config/config.js';
import { Readable } from 'stream';

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.model = config.openai.model;
    this.ttsModel = config.openai.ttsModel;
    this.ttsVoice = config.openai.ttsVoice;
    this.whisperModel = config.openai.whisperModel;
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   * @param {Buffer} audioBuffer - Audio data in WAV format
   * @param {string} language - Language code (default: 'en')
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioBuffer, language = 'en') {
    try {
      console.log(`Transcribing audio (${audioBuffer.length} bytes)`);

      // Create a file-like object from buffer
      const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      const response = await this.client.audio.transcriptions.create({
        file: file,
        model: this.whisperModel,
        language: language,
        response_format: 'text'
      });

      console.log(`Transcription successful: ${response.substring(0, 100)}...`);
      return response;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Generate response using OpenAI Chat Completions API
   * @param {Array} messages - Array of message objects with role and content
   * @param {Array} tools - Optional array of function definitions
   * @returns {Promise<Object>} Response object with content and optional tool calls
   */
  async generateResponse(messages, tools = null) {
    try {
      console.log(`Generating response for ${messages.length} messages`);

      const params = {
        model: this.model,
        messages: messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature
      };

      // Add tools if provided
      if (tools && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = 'auto';
      }

      const response = await this.client.chat.completions.create(params);

      const message = response.choices[0].message;
      const result = {
        content: message.content,
        toolCalls: message.tool_calls || null,
        finishReason: response.choices[0].finish_reason
      };

      console.log(`Response generated: ${result.content ? result.content.substring(0, 100) + '...' : '[tool call]'}`);
      return result;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  /**
   * Generate streaming response
   * @param {Array} messages - Array of message objects
   * @param {Array} tools - Optional array of function definitions
   * @returns {AsyncGenerator} Stream of response chunks
   */
  async *generateResponseStream(messages, tools = null) {
    try {
      console.log(`Generating streaming response for ${messages.length} messages`);

      const params = {
        model: this.model,
        messages: messages,
        max_tokens: config.openai.maxTokens,
        temperature: config.openai.temperature,
        stream: true
      };

      if (tools && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = 'auto';
      }

      const stream = await this.client.chat.completions.create(params);

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    } catch (error) {
      console.error('Error generating streaming response:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech using OpenAI TTS API
   * @param {string} text - Text to convert
   * @param {string} voice - Voice to use (default: from config)
   * @param {string} responseFormat - Audio format (mp3, opus, aac, flac, wav, pcm, mulaw)
   * @returns {Promise<Buffer>} Audio data
   */
  async textToSpeech(text, voice = null, responseFormat = 'mp3') {
    try {
      voice = voice || this.ttsVoice;
      console.log(`Converting text to speech: ${text.substring(0, 100)}...`);

      const response = await this.client.audio.speech.create({
        model: this.ttsModel,
        voice: voice,
        input: text,
        response_format: responseFormat
      });

      // Convert response to buffer
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`TTS successful: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error('Error converting text to speech:', error);
      throw error;
    }
  }

  /**
   * Generate response with context from knowledge base
   * Orchestrates the conversation with context injection
   * @param {string} userMessage - User's message
   * @param {string} context - Context from knowledge base
   * @param {Array} conversationHistory - Previous messages
   * @param {Array} tools - Available tools for function calling
   * @returns {Promise<Object>} Response with content and tool calls
   */
  async generateWithContext(userMessage, context = null, conversationHistory = [], tools = null) {
    const messages = [];

    // System message with context
    let systemContent = 'You are a helpful AI assistant for a voice conversation. Respond naturally and concisely.';
    if (context) {
      systemContent += `\n\nRelevant information:\n${context}`;
    }

    messages.push({
      role: 'system',
      content: systemContent
    });

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Generate response
    const response = await this.generateResponse(messages, tools);
    return response;
  }

  /**
   * Handle tool/function calls
   * Executes the requested function and returns result
   * @param {Array} toolCalls - Array of tool calls from LLM
   * @param {Function} toolExecutor - Function to execute tools
   * @returns {Promise<Array>} Array of tool results
   */
  async handleToolCalls(toolCalls, toolExecutor) {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Executing function: ${functionName}`, functionArgs);

        // Execute the function
        const result = await toolExecutor(functionName, functionArgs);

        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result)
        });
      } catch (error) {
        console.error(`Error executing tool ${toolCall.function.name}:`, error);
        results.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolCall.function.name,
          content: JSON.stringify({ error: error.message })
        });
      }
    }

    return results;
  }

  /**
   * Generate response with tool call handling
   * Automatically handles function calling loop
   * @param {string} userMessage - User's message
   * @param {string} context - Knowledge base context
   * @param {Array} conversationHistory - Previous messages
   * @param {Array} tools - Available tools
   * @param {Function} toolExecutor - Function to execute tools
   * @returns {Promise<string>} Final response text
   */
  async generateWithTools(userMessage, context = null, conversationHistory = [], tools = null, toolExecutor = null) {
    const messages = [];

    // System message
    let systemContent = 'You are a helpful AI assistant for a voice conversation. Respond naturally and concisely.';
    if (context) {
      systemContent += `\n\nRelevant information:\n${context}`;
    }

    messages.push({
      role: 'system',
      content: systemContent
    });

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Loop to handle tool calls
    let maxIterations = 5; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      const response = await this.generateResponse(messages, tools);

      // If no tool calls, return the content
      if (!response.toolCalls || response.finishReason === 'stop') {
        return response.content;
      }

      // Handle tool calls
      if (toolExecutor) {
        // Add assistant's message with tool calls
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls
        });

        // Execute tools and get results
        const toolResults = await this.handleToolCalls(response.toolCalls, toolExecutor);

        // Add tool results to messages
        messages.push(...toolResults);

        // Continue loop to get final response
      } else {
        // No tool executor provided, return content
        return response.content || 'I need to use a tool but cannot execute it.';
      }
    }

    // Max iterations reached
    return 'I apologize, but I encountered an issue processing your request.';
  }
}

// Singleton instance
const openaiService = new OpenAIService();

export default openaiService;
