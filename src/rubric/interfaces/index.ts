export type RubricDraft = {
  title: string;
  description?: string;
  criteria: Array<{
    title: string;
    description?: string;
    weight: number;
    levels: Array<{ title: string; description?: string; points: number }>;
  }>;
};

export type AiDraftResult = {
  curriculumSummary?: string;
  draft: RubricDraft;
};
