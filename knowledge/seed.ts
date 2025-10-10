import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { knowledgeBaseService } from '../src/services/knowledge-base.service.js';
import { logger } from '../src/utils/logger.js';
import type { KnowledgeDocument } from '../src/types/knowledge.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Seed the knowledge base with sample documents
 */
async function seedKnowledgeBase() {
  try {
    logger.info('🌱 Starting knowledge base seeding...');

    // Initialize the knowledge base service
    await knowledgeBaseService.initialize();

    // Read documents from JSON file
    const docsPath = join(__dirname, 'docs.json');
    const docsContent = readFileSync(docsPath, 'utf-8');
    const documents: KnowledgeDocument[] = JSON.parse(docsContent);

    logger.info({ count: documents.length }, 'Loaded documents from file');

    // Index the documents
    await knowledgeBaseService.indexDocuments(documents);

    logger.info('✅ Knowledge base seeded successfully!');

    // Get stats
    const stats = await knowledgeBaseService.getStats();
    logger.info(
      {
        totalDocuments: stats.totalDocuments,
        collectionName: stats.collectionName,
      },
      'Knowledge base statistics'
    );

    // Test a search
    logger.info('🔍 Testing knowledge base search...');
    const testResults = await knowledgeBaseService.search('What are your business hours?', 3);

    logger.info(
      {
        query: 'What are your business hours?',
        resultsCount: testResults.length,
      },
      'Search test completed'
    );

    if (testResults.length > 0) {
      logger.info('Top result:');
      logger.info({
        text: testResults[0].text.substring(0, 100) + '...',
        score: testResults[0].score,
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Failed to seed knowledge base');
    process.exit(1);
  }
}

// Run the seeding
seedKnowledgeBase();
