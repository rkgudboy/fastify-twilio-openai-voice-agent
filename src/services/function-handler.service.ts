import { OpenAITool } from '../types/openai.types.js';
import { logger } from '../utils/logger.js';

/**
 * Function handler service
 * Handles function calls from OpenAI Realtime API
 */
class FunctionHandlerService {
  private handlers = new Map<string, (args: unknown) => Promise<string>>();

  /**
   * Register a function handler
   */
  register(name: string, handler: (args: unknown) => Promise<string>): void {
    this.handlers.set(name, handler);
    logger.info({ name }, 'Registered function handler');
  }

  /**
   * Execute a function by name
   */
  async execute(name: string, args: unknown): Promise<string> {
    const handler = this.handlers.get(name);

    if (!handler) {
      logger.warn({ name, args }, 'Function handler not found');
      return JSON.stringify({
        error: `Function ${name} not found`,
      });
    }

    try {
      logger.info({ name, args }, 'Executing function');
      const result = await handler(args);
      logger.info({ name, result }, 'Function executed successfully');
      return result;
    } catch (error) {
      logger.error({ error, name, args }, 'Function execution failed');
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all registered function tools for OpenAI
   */
  getTools(): OpenAITool[] {
    return Array.from(this.handlers.keys()).map((name) => {
      // Return basic tool definitions
      // These should be customized based on actual implementation
      return this.getToolDefinition(name);
    });
  }

  /**
   * Get tool definition for a specific function
   */
  private getToolDefinition(name: string): OpenAITool {
    // Predefined tool definitions
    const toolDefinitions: Record<string, OpenAITool> = {
      search_knowledge_base: {
        type: 'function',
        name: 'search_knowledge_base',
        description: 'Search the knowledge base for relevant information to answer user questions',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant information',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 3)',
            },
          },
          required: ['query'],
        },
      },
      get_business_hours: {
        type: 'function',
        name: 'get_business_hours',
        description: 'Get the business hours for a specific day or current day',
        parameters: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              description: 'Day of week (e.g., Monday, Tuesday). If not provided, uses current day.',
            },
          },
        },
      },
      transfer_call: {
        type: 'function',
        name: 'transfer_call',
        description: 'Transfer the call to a human agent or specific department',
        parameters: {
          type: 'object',
          properties: {
            department: {
              type: 'string',
              description: 'Department to transfer to (e.g., sales, support, billing)',
            },
            reason: {
              type: 'string',
              description: 'Reason for transfer',
            },
          },
          required: ['department'],
        },
      },
    };

    return (
      toolDefinitions[name] || {
        type: 'function',
        name,
        description: `Function ${name}`,
        parameters: {
          type: 'object',
          properties: {},
        },
      }
    );
  }
}

export const functionHandlerService = new FunctionHandlerService();
