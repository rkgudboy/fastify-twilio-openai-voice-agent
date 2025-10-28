/**
 * Function Calling Tools
 * Defines available functions for OpenAI function calling
 */

import chromadbService from '../services/chromadb.service.js';
import mongodbService from '../services/mongodb.service.js';

/**
 * Tool definitions for OpenAI function calling
 * These are passed to the LLM so it knows what functions are available
 */
export const tools = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the knowledge base for relevant information about a topic or question',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query or question to find information about'
          },
          top_k: {
            type: 'number',
            description: 'Number of results to return (default: 3)',
            default: 3
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_call_history',
      description: 'Get recent call history or information about previous calls from a phone number',
      parameters: {
        type: 'object',
        properties: {
          phone_number: {
            type: 'string',
            description: 'Phone number to search for (optional, if not provided returns recent calls)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of calls to return (default: 5)',
            default: 5
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

/**
 * Execute a function call
 * This is called when the LLM requests to use a function
 * @param {string} functionName - Name of the function to execute
 * @param {Object} args - Arguments for the function
 * @returns {Promise<Object>} Function execution result
 */
export async function executeTool(functionName, args) {
  console.log(`Executing tool: ${functionName}`, args);

  switch (functionName) {
    case 'search_knowledge_base':
      return await searchKnowledgeBase(args);

    case 'get_call_history':
      return await getCallHistory(args);

    case 'get_current_time':
      return getCurrentTime(args);

    default:
      return {
        error: `Unknown function: ${functionName}`
      };
  }
}

/**
 * Search the knowledge base
 */
async function searchKnowledgeBase(args) {
  try {
    const { query, top_k = 3 } = args;

    const documents = await chromadbService.searchDocuments(query, top_k);

    if (documents.length === 0) {
      return {
        success: true,
        found: false,
        message: 'No relevant information found in the knowledge base'
      };
    }

    return {
      success: true,
      found: true,
      results: documents.map(doc => ({
        content: doc.content,
        metadata: doc.metadata,
        relevance: 1 - doc.distance // Convert distance to similarity score
      }))
    };
  } catch (error) {
    console.error('Error in searchKnowledgeBase:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get call history
 */
async function getCallHistory(args) {
  try {
    const { phone_number, limit = 5 } = args;

    let calls;

    if (phone_number) {
      // Search for calls from this specific number
      const allCalls = await mongodbService.getRecentCalls(100); // Get more to filter
      calls = allCalls
        .filter(call => call.from_number === phone_number)
        .slice(0, limit);
    } else {
      // Get recent calls
      calls = await mongodbService.getRecentCalls(limit);
    }

    if (calls.length === 0) {
      return {
        success: true,
        found: false,
        message: phone_number
          ? `No call history found for ${phone_number}`
          : 'No recent calls found'
      };
    }

    return {
      success: true,
      found: true,
      calls: calls.map(call => ({
        call_sid: call.call_sid,
        from_number: call.from_number,
        to_number: call.to_number,
        status: call.status,
        created_at: call.created_at,
        duration: call.duration
      }))
    };
  } catch (error) {
    console.error('Error in getCallHistory:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current time
 */
function getCurrentTime(args) {
  const now = new Date();
  return {
    success: true,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  };
}

export default {
  tools,
  executeTool
};
