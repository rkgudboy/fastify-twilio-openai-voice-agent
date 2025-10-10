import { ChromaClient, Collection } from 'chromadb';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { KnowledgeDocument, SearchResult, IndexStats } from '../types/knowledge.types.js';

/**
 * Knowledge base service using ChromaDB for vector storage
 */
class KnowledgeBaseService {
  private client: ChromaClient | null = null;
  private collection: Collection | null = null;
  private openai: OpenAI;
  private readonly collectionName: string;
  private readonly chromaUrl: string;
  private isInitialized = false;

  constructor() {
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.collectionName = env.CHROMA_COLLECTION_NAME;
    this.chromaUrl = env.CHROMA_URL;
  }

  /**
   * Initialize ChromaDB client and collection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug('Knowledge base already initialized');
      return;
    }

    try {
      // Initialize ChromaDB client
      this.client = new ChromaClient({
        path: this.chromaUrl,
      });

      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });

      this.isInitialized = true;
      logger.info(
        {
          collectionName: this.collectionName,
          chromaUrl: this.chromaUrl,
        },
        '✅ Knowledge base initialized'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to initialize knowledge base');
      throw error;
    }
  }

  /**
   * Ensure the service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.collection) {
      throw new Error('Knowledge base not initialized. Call initialize() first.');
    }
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error({ error, text: text.substring(0, 100) }, 'Failed to generate embedding');
      throw error;
    }
  }

  /**
   * Index multiple documents into the knowledge base
   */
  async indexDocuments(docs: KnowledgeDocument[]): Promise<void> {
    this.ensureInitialized();

    if (docs.length === 0) {
      logger.warn('No documents to index');
      return;
    }

    try {
      logger.info({ count: docs.length }, 'Starting to index documents');

      // Generate embeddings for all documents
      const embeddings = await Promise.all(
        docs.map(async (doc) => {
          const embedding = await this.generateEmbedding(doc.text);
          return embedding;
        })
      );

      // Add to ChromaDB
      await this.collection!.add({
        ids: docs.map((d) => d.id),
        embeddings,
        documents: docs.map((d) => d.text),
        metadatas: docs.map((d) => ({
          title: d.title,
          category: d.category,
          priority: d.priority || 'normal',
          ...d.metadata,
        })),
      });

      logger.info({ count: docs.length }, '✅ Indexed documents successfully');
    } catch (error) {
      logger.error({ error, count: docs.length }, 'Failed to index documents');
      throw error;
    }
  }

  /**
   * Search the knowledge base
   */
  async search(query: string, limit = 3): Promise<SearchResult[]> {
    this.ensureInitialized();

    try {
      const startTime = Date.now();

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Search ChromaDB
      const results = await this.collection!.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
      });

      const latency = Date.now() - startTime;

      // Format results
      const searchResults: SearchResult[] = [];

      if (results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const text = results.documents[0][i];
          const distance = results.distances?.[0]?.[i] || 0;
          const metadata = results.metadatas?.[0]?.[i] || {};

          if (text) {
            searchResults.push({
              text,
              score: 1 - distance, // Convert distance to similarity score
              metadata: metadata as Record<string, unknown>,
            });
          }
        }
      }

      logger.info(
        {
          query: query.substring(0, 100),
          latency,
          resultsCount: searchResults.length,
        },
        'Knowledge search completed'
      );

      return searchResults;
    } catch (error) {
      logger.error({ error, query }, 'Knowledge search failed');
      throw error;
    }
  }

  /**
   * List all documents in the knowledge base
   */
  async listDocuments(): Promise<KnowledgeDocument[]> {
    this.ensureInitialized();

    try {
      const result = await this.collection!.get();

      const documents: KnowledgeDocument[] = [];

      if (result.ids) {
        for (let i = 0; i < result.ids.length; i++) {
          const id = result.ids[i];
          const text = result.documents?.[i] || '';
          const metadata = result.metadatas?.[i] as any;

          documents.push({
            id,
            title: metadata?.title || '',
            text,
            category: metadata?.category || '',
            priority: metadata?.priority as 'low' | 'normal' | 'high',
            metadata: metadata || {},
          });
        }
      }

      logger.debug({ count: documents.length }, 'Listed documents from knowledge base');

      return documents;
    } catch (error) {
      logger.error({ error }, 'Failed to list documents');
      throw error;
    }
  }

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      await this.collection!.delete({
        ids: [id],
      });

      logger.info({ id }, 'Deleted document from knowledge base');
      return true;
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete document');
      return false;
    }
  }

  /**
   * Get statistics about the knowledge base
   */
  async getStats(): Promise<IndexStats> {
    this.ensureInitialized();

    try {
      const result = await this.collection!.get();
      const count = result.ids?.length || 0;

      return {
        totalDocuments: count,
        lastIndexed: count > 0 ? new Date().toISOString() : null,
        collectionName: this.collectionName,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get knowledge base stats');
      throw error;
    }
  }

  /**
   * Clear all documents from the knowledge base
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    try {
      // Delete the collection and recreate it
      await this.client!.deleteCollection({ name: this.collectionName });
      this.collection = await this.client!.createCollection({
        name: this.collectionName,
        metadata: { 'hnsw:space': 'cosine' },
      });

      logger.warn('Knowledge base cleared');
    } catch (error) {
      logger.error({ error }, 'Failed to clear knowledge base');
      throw error;
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
