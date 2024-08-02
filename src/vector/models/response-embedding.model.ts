export interface EmbeddingsResponse {
  predictions: Prediction[];
  metadata: Metadata;
}

interface Prediction {
  embeddings: Embeddings;
}

interface Embeddings {
  values: number[];
  statistics: EmbeddingsStatistics;
}

interface EmbeddingsStatistics {
  truncated: boolean;
  token_count: number;
}

interface Metadata {
  billableCharacterCount: number;
}
