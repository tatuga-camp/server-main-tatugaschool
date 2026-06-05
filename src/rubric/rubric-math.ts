export type RubricMathCriterion = { weight: number; maxPoints: number };
export type RubricMathSelection = { points: number; weight: number };

export function computeRubricScore(input: {
  criteria: RubricMathCriterion[];
  selections: RubricMathSelection[];
  maxScore: number | null;
}): number {
  const rawMax = input.criteria.reduce(
    (sum, c) => sum + c.maxPoints * c.weight,
    0,
  );
  const rawScore = input.selections.reduce(
    (sum, s) => sum + s.points * s.weight,
    0,
  );
  if (rawMax <= 0) return 0;
  if (input.maxScore == null) return rawScore;
  return (rawScore / rawMax) * input.maxScore;
}
