import { FastifyInstance, FastifyRequest } from 'fastify';
import { Type } from '@sinclair/typebox';
import {
  KnowledgeDocumentSchema,
  SearchRequestSchema,
  SearchResultSchema,
  IndexRequestSchema,
  SuccessResponseSchema,
} from '../types/api.types.js';
import { knowledgeBaseService } from '../services/knowledge-base.service.js';

export async function registerKnowledgeRoutes(app: FastifyInstance) {
  // List all knowledge documents
  app.get(
    '/',
    {
      schema: {
        tags: ['knowledge'],
        description: 'List all documents in the knowledge base',
        response: {
          200: Type.Object({
            documents: Type.Array(KnowledgeDocumentSchema),
            total: Type.Number(),
          }),
        },
      },
    },
    async () => {
      const documents = await knowledgeBaseService.listDocuments();
      return {
        documents,
        total: documents.length,
      };
    }
  );

  // Search knowledge base
  app.post(
    '/search',
    {
      schema: {
        tags: ['knowledge'],
        description: 'Search the knowledge base using semantic similarity',
        body: SearchRequestSchema,
        response: {
          200: SearchResultSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Body: { query: string; limit?: number } }>) => {
      const { query, limit = 3 } = request.body;

      const results = await knowledgeBaseService.search(query, limit);

      return {
        results,
        query,
        count: results.length,
      };
    }
  );

  // Index new documents
  app.post(
    '/index',
    {
      schema: {
        tags: ['knowledge'],
        description: 'Index new documents into the knowledge base',
        body: IndexRequestSchema,
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            indexed: Type.Number(),
          }),
        },
      },
    },
    async (request: FastifyRequest<{ Body: { documents: any[] } }>) => {
      const { documents } = request.body;

      await knowledgeBaseService.indexDocuments(documents);

      return {
        success: true,
        indexed: documents.length,
      };
    }
  );

  // Get knowledge base statistics
  app.get(
    '/stats',
    {
      schema: {
        tags: ['knowledge'],
        description: 'Get knowledge base statistics',
        response: {
          200: Type.Object({
            totalDocuments: Type.Number(),
            lastIndexed: Type.Union([Type.String(), Type.Null()]),
            collectionName: Type.String(),
          }),
        },
      },
    },
    async () => {
      const stats = await knowledgeBaseService.getStats();
      return stats;
    }
  );

  // Delete a document
  app.delete(
    '/:id',
    {
      schema: {
        tags: ['knowledge'],
        description: 'Delete a document from the knowledge base',
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: SuccessResponseSchema,
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const { id } = request.params;
      const success = await knowledgeBaseService.deleteDocument(id);

      return {
        success,
        message: success ? 'Document deleted successfully' : 'Document not found',
      };
    }
  );
}
