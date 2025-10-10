export interface KnowledgeDocument {
  id: string;
  title: string;
  text: string;
  category: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  filter?: Record<string, unknown>;
}

export interface KnowledgeBaseConfig {
  collectionName: string;
  embeddingModel: string;
  chromaPath: string;
}

export interface IndexStats {
  totalDocuments: number;
  lastIndexed: string | null;
  collectionName: string;
}
