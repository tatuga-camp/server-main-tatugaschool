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

export type ResponseNonStreamingText = {
  candidates: {
    content: {
      role: string;
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
    avgLogprobs: number;
  }[];

  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    promptTokensDetails: [[Object], [Object]];
    candidatesTokensDetails: [[Object]];
  };
  modelVersion?: string;
  createTime?: string;
  responseId?: string;
};
