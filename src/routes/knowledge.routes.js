/**
 * Knowledge Base routes
 * CRUD operations for the ChromaDB knowledge base
 */

import chromadbService from '../services/chromadb.service.js';

/**
 * Register Knowledge Base routes
 */
export default async function knowledgeRoutes(fastify, options) {
  /**
   * Add a single document
   */
  fastify.post('/documents', {
    schema: {
      tags: ['Knowledge Base'],
      description: 'Add a single document to the knowledge base',
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', description: 'Document content' },
          metadata: { type: 'object', description: 'Optional metadata' },
          id: { type: 'string', description: 'Optional custom ID' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            document: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                metadata: { type: 'object' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { content, metadata, id } = request.body;

      if (!content) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      const document = await chromadbService.addDocument(content, metadata || {}, id);

      reply.code(201).send({
        success: true,
        document: document
      });
    } catch (error) {
      console.error('Error adding document:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Add multiple documents in bulk
   */
  fastify.post('/documents/bulk', async (request, reply) => {
    try {
      const { documents } = request.body;

      if (!documents || !Array.isArray(documents)) {
        return reply.code(400).send({ error: 'Documents array is required' });
      }

      const addedDocuments = await chromadbService.addDocuments(documents);

      reply.code(201).send({
        success: true,
        count: addedDocuments.length,
        documents: addedDocuments
      });
    } catch (error) {
      console.error('Error adding documents:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Search knowledge base
   */
  fastify.post('/search', {
    schema: {
      tags: ['Knowledge Base'],
      description: 'Search the knowledge base using semantic similarity',
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search query' },
          top_k: { type: 'number', description: 'Number of results (default: 3)', default: 3 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            query: { type: 'string' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  metadata: { type: 'object' },
                  distance: { type: 'number' }
                }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { query, top_k } = request.body;

      if (!query) {
        return reply.code(400).send({ error: 'Query is required' });
      }

      const topK = top_k || 3;
      const documents = await chromadbService.searchDocuments(query, topK);

      reply.send({
        success: true,
        query: query,
        results: documents
      });
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get all documents
   */
  fastify.get('/documents', async (request, reply) => {
    try {
      const documents = await chromadbService.getAllDocuments();

      reply.send({
        success: true,
        count: documents.length,
        documents: documents
      });
    } catch (error) {
      console.error('Error getting documents:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Update a document
   */
  fastify.put('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { content, metadata } = request.body;

      if (!content) {
        return reply.code(400).send({ error: 'Content is required' });
      }

      const document = await chromadbService.updateDocument(id, content, metadata || {});

      reply.send({
        success: true,
        document: document
      });
    } catch (error) {
      console.error('Error updating document:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Delete a document
   */
  fastify.delete('/documents/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const result = await chromadbService.deleteDocument(id);

      reply.send({
        success: true,
        result: result
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      reply.code(500).send({ error: error.message });
    }
  });

  /**
   * Get knowledge base statistics
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await chromadbService.getStats();

      reply.send({
        success: true,
        stats: stats
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      reply.code(500).send({ error: error.message });
    }
  });
}
