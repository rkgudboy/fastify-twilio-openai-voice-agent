import { MongoClient, Db, Collection } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * MongoDB service for persistent data storage
 */
class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      logger.debug('MongoDB already connected');
      return;
    }

    try {
      logger.info({ uri: this.maskUri(env.MONGODB_URI) }, 'Connecting to MongoDB...');

      this.client = new MongoClient(env.MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();

      // Verify connection
      await this.client.db('admin').command({ ping: 1 });

      this.db = this.client.db(env.MONGODB_DB_NAME);
      this.isConnected = true;

      logger.info(
        {
          database: env.MONGODB_DB_NAME,
        },
        '✅ MongoDB connected successfully'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to connect to MongoDB');
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      this.client = null;
      this.db = null;
      logger.info('MongoDB disconnected');
    }
  }

  /**
   * Check if connected to MongoDB
   */
  isReady(): boolean {
    return this.isConnected && this.db !== null;
  }

  /**
   * Get database instance
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Get a collection
   */
  getCollection(name: string): Collection {
    return this.getDb().collection(name);
  }

  /**
   * Health check for MongoDB
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch (error) {
      logger.error({ error }, 'MongoDB health check failed');
      return false;
    }
  }

  /**
   * Mask sensitive parts of MongoDB URI for logging
   */
  private maskUri(uri: string): string {
    // Replace password in connection string for safe logging
    return uri.replace(/:([^@]+)@/, ':****@');
  }

  /**
   * Initialize collections and indexes
   */
  async initializeCollections(): Promise<void> {
    if (!this.isReady()) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Call logs collection
      const callLogsCollection = this.getCollection('call_logs');
      await callLogsCollection.createIndex({ callSid: 1 }, { unique: true });
      await callLogsCollection.createIndex({ createdAt: -1 });
      await callLogsCollection.createIndex({ caller: 1 });

      // Sessions collection
      const sessionsCollection = this.getCollection('sessions');
      await sessionsCollection.createIndex({ callSid: 1 }, { unique: true });
      await sessionsCollection.createIndex({ status: 1 });
      await sessionsCollection.createIndex({ createdAt: -1 });

      // Knowledge documents metadata (optional - for tracking document sources)
      const knowledgeMetaCollection = this.getCollection('knowledge_metadata');
      await knowledgeMetaCollection.createIndex({ documentId: 1 }, { unique: true });
      await knowledgeMetaCollection.createIndex({ category: 1 });

      logger.info('✅ MongoDB collections and indexes initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize MongoDB collections');
      throw error;
    }
  }
}

export const mongoDBService = new MongoDBService();

/**
 * MongoDB document interfaces
 */

export interface CallLogDocument {
  callSid: string;
  caller: string;
  callee: string;
  status: string;
  duration: number;
  startTime: Date;
  endTime?: Date;
  transcript?: string;
  summary?: string;
  metrics?: {
    audioPacketsReceived: number;
    audioPacketsSent: number;
    knowledgeSearches: number;
    functionCalls: number;
    errors: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  callSid: string;
  streamSid: string;
  caller: string;
  status: 'connecting' | 'active' | 'closing' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeMetadataDocument {
  documentId: string;
  title: string;
  category: string;
  source?: string;
  uploadedAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}
