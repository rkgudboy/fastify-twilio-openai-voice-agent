/**
 * MongoDB Service
 * Manages call sessions, transcripts, and analytics
 */

import { MongoClient } from 'mongodb';
import config from '../config/config.js';

class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
    this.callSessionsCollection = null;
    this.transcriptsCollection = null;
    this.analyticsCollection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      this.client = new MongoClient(config.mongodb.url, {
        maxPoolSize: config.mongodb.maxPoolSize,
        minPoolSize: config.mongodb.minPoolSize
      });

      await this.client.connect();
      this.db = this.client.db(config.mongodb.dbName);

      // Get collections
      this.callSessionsCollection = this.db.collection('call_sessions');
      this.transcriptsCollection = this.db.collection('transcripts');
      this.analyticsCollection = this.db.collection('analytics');

      // Create indexes
      await this.createIndexes();

      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Create indexes for better performance
   */
  async createIndexes() {
    try {
      await this.callSessionsCollection.createIndex({ call_sid: 1 }, { unique: true });
      await this.callSessionsCollection.createIndex({ created_at: -1 });
      await this.transcriptsCollection.createIndex({ call_sid: 1 });
      await this.transcriptsCollection.createIndex({ timestamp: -1 });
      await this.analyticsCollection.createIndex({ call_sid: 1 });
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  /**
   * Close MongoDB connection
   */
  async close() {
    try {
      if (this.client) {
        await this.client.close();
        console.log('MongoDB connection closed');
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.client.db('admin').command({ ping: 1 });
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Create a new call session
   */
  async createCallSession(callSid, fromNumber, toNumber) {
    try {
      const session = {
        call_sid: callSid,
        from_number: fromNumber,
        to_number: toNumber,
        status: 'initiated',
        created_at: new Date(),
        updated_at: new Date(),
        started_at: null,
        ended_at: null,
        duration: null
      };

      await this.callSessionsCollection.insertOne(session);
      console.log(`Call session created: ${callSid}`);
      return session;
    } catch (error) {
      console.error('Error creating call session:', error);
      throw error;
    }
  }

  /**
   * Update call status
   */
  async updateCallStatus(callSid, status) {
    try {
      const update = {
        status: status,
        updated_at: new Date()
      };

      if (status === 'in-progress') {
        update.started_at = new Date();
      } else if (status === 'completed' || status === 'failed') {
        update.ended_at = new Date();
      }

      await this.callSessionsCollection.updateOne(
        { call_sid: callSid },
        { $set: update }
      );

      console.log(`Call status updated: ${callSid} -> ${status}`);
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }

  /**
   * End call session and calculate duration
   */
  async endCallSession(callSid) {
    try {
      const session = await this.callSessionsCollection.findOne({ call_sid: callSid });

      if (session && session.started_at) {
        const endedAt = new Date();
        const duration = Math.floor((endedAt - session.started_at) / 1000); // seconds

        await this.callSessionsCollection.updateOne(
          { call_sid: callSid },
          {
            $set: {
              status: 'completed',
              ended_at: endedAt,
              duration: duration,
              updated_at: endedAt
            }
          }
        );

        console.log(`Call session ended: ${callSid}, duration: ${duration}s`);
      }
    } catch (error) {
      console.error('Error ending call session:', error);
      throw error;
    }
  }

  /**
   * Add message to transcript
   */
  async addMessageToTranscript(callSid, role, content) {
    try {
      const message = {
        call_sid: callSid,
        role: role, // 'user' or 'assistant'
        content: content,
        timestamp: new Date()
      };

      await this.transcriptsCollection.insertOne(message);
      console.log(`Message added to transcript: ${callSid}, ${role}`);
    } catch (error) {
      console.error('Error adding message to transcript:', error);
      throw error;
    }
  }

  /**
   * Get call details
   */
  async getCallDetails(callSid) {
    try {
      const session = await this.callSessionsCollection.findOne({ call_sid: callSid });
      return session;
    } catch (error) {
      console.error('Error getting call details:', error);
      throw error;
    }
  }

  /**
   * Get call transcript
   */
  async getCallTranscript(callSid) {
    try {
      const messages = await this.transcriptsCollection
        .find({ call_sid: callSid })
        .sort({ timestamp: 1 })
        .toArray();

      return messages;
    } catch (error) {
      console.error('Error getting call transcript:', error);
      throw error;
    }
  }

  /**
   * Get recent calls
   */
  async getRecentCalls(limit = 10) {
    try {
      const calls = await this.callSessionsCollection
        .find({})
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();

      return calls;
    } catch (error) {
      console.error('Error getting recent calls:', error);
      throw error;
    }
  }

  /**
   * Store call analytics
   */
  async storeCallAnalytics(callSid, analytics) {
    try {
      const analyticsData = {
        call_sid: callSid,
        ...analytics,
        timestamp: new Date()
      };

      await this.analyticsCollection.insertOne(analyticsData);
      console.log(`Analytics stored for call: ${callSid}`);
    } catch (error) {
      console.error('Error storing analytics:', error);
      throw error;
    }
  }

  /**
   * Get call analytics
   */
  async getCallAnalytics(callSid) {
    try {
      const analytics = await this.analyticsCollection.findOne({ call_sid: callSid });
      return analytics;
    } catch (error) {
      console.error('Error getting call analytics:', error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    try {
      const totalCalls = await this.callSessionsCollection.countDocuments();
      const activeCalls = await this.callSessionsCollection.countDocuments({ status: 'in-progress' });
      const completedCalls = await this.callSessionsCollection.countDocuments({ status: 'completed' });

      // Average call duration
      const avgResult = await this.callSessionsCollection.aggregate([
        { $match: { duration: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ]).toArray();

      const avgDuration = avgResult.length > 0 ? avgResult[0].avgDuration : 0;

      return {
        total_calls: totalCalls,
        active_calls: activeCalls,
        completed_calls: completedCalls,
        average_duration: Math.round(avgDuration)
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData() {
    try {
      const metrics = await this.getSystemMetrics();
      const recentCalls = await this.getRecentCalls(5);

      return {
        metrics,
        recent_calls: recentCalls
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }
}

// Singleton instance
const mongodbService = new MongoDBService();

export default mongodbService;
