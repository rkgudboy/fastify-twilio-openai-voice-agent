/**
 * ChromaDB Service
 * Vector database for knowledge retrieval
 */

import { ChromaClient } from 'chromadb';
import config from '../config/config.js';

class ChromaDBService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.collectionName = config.chromadb.collectionName;
  }

  /**
   * Initialize ChromaDB connection and collection
   */
  async initialize() {
    try {
      this.client = new ChromaClient({
        path: config.chromadb.url
      });

      // Get or create collection
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: { 'hnsw:space': 'cosine' }
        });
      } catch (error) {
        // If collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: { 'hnsw:space': 'cosine' }
        });
      }

      console.log('ChromaDB initialized successfully');
    } catch (error) {
      console.error('Error initializing ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  healthCheck() {
    try {
      if (this.client && this.collection) {
        return { status: 'healthy' };
      }
      return { status: 'unhealthy', error: 'Not initialized' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(content, metadata = {}, id = null) {
    try {
      const docId = id || this.generateId();

      await this.collection.add({
        ids: [docId],
        documents: [content],
        metadatas: [metadata]
      });

      console.log(`Document added to ChromaDB: ${docId}`);
      return { id: docId, content, metadata };
    } catch (error) {
      console.error('Error adding document to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Add multiple documents in bulk
   */
  async addDocuments(documents) {
    try {
      const ids = documents.map(doc => doc.id || this.generateId());
      const contents = documents.map(doc => doc.content);
      const metadatas = documents.map(doc => doc.metadata || {});

      await this.collection.add({
        ids: ids,
        documents: contents,
        metadatas: metadatas
      });

      console.log(`${documents.length} documents added to ChromaDB`);
      return ids.map((id, index) => ({
        id,
        content: contents[index],
        metadata: metadatas[index]
      }));
    } catch (error) {
      console.error('Error adding documents to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Search for documents by query
   */
  async searchDocuments(query, topK = 3) {
    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: topK
      });

      // Format results
      const documents = [];
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          documents.push({
            id: results.ids[0][i],
            content: results.documents[0][i],
            metadata: results.metadatas[0][i],
            distance: results.distances[0][i]
          });
        }
      }

      console.log(`Found ${documents.length} documents for query: "${query}"`);
      return documents;
    } catch (error) {
      console.error('Error searching ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Get context for a query (formatted for LLM)
   */
  async getContextForQuery(query, topK = 3, similarityThreshold = 0.7) {
    try {
      const documents = await this.searchDocuments(query, topK);

      // Filter by similarity threshold (distance < 1 - threshold)
      const distanceThreshold = 1 - similarityThreshold;
      const relevantDocs = documents.filter(doc => doc.distance < distanceThreshold);

      if (relevantDocs.length === 0) {
        return null;
      }

      // Format context as string
      const contextParts = relevantDocs.map(doc => doc.content);
      const context = contextParts.join('\n\n');

      return context;
    } catch (error) {
      console.error('Error getting context for query:', error);
      return null;
    }
  }

  /**
   * Get all documents
   */
  async getAllDocuments() {
    try {
      const results = await this.collection.get();

      const documents = [];
      if (results.ids) {
        for (let i = 0; i < results.ids.length; i++) {
          documents.push({
            id: results.ids[i],
            content: results.documents[i],
            metadata: results.metadatas[i]
          });
        }
      }

      return documents;
    } catch (error) {
      console.error('Error getting all documents:', error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(id, content, metadata = {}) {
    try {
      await this.collection.update({
        ids: [id],
        documents: [content],
        metadatas: [metadata]
      });

      console.log(`Document updated: ${id}`);
      return { id, content, metadata };
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id) {
    try {
      await this.collection.delete({
        ids: [id]
      });

      console.log(`Document deleted: ${id}`);
      return { id, deleted: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      const count = await this.collection.count();
      return {
        collection_name: this.collectionName,
        document_count: count
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
const chromadbService = new ChromaDBService();

export default chromadbService;
