import { computeRubricScore } from './rubric-math';

describe('computeRubricScore', () => {
  const criteria = [
    { weight: 1, maxPoints: 4 },
    { weight: 1, maxPoints: 4 },
  ];

  it('normalizes a full top grade to maxScore', () => {
    const result = computeRubricScore({
      criteria,
      selections: [{ points: 4, weight: 1 }, { points: 4, weight: 1 }],
      maxScore: 10,
    });
    expect(result).toBe(10);
  });

  it('applies per-criterion weights', () => {
    // rawMax = 4*3 + 4*1 = 16; rawScore = 4*3 + 2*1 = 14; 14/16*10 = 8.75
    const result = computeRubricScore({
      criteria: [{ weight: 3, maxPoints: 4 }, { weight: 1, maxPoints: 4 }],
      selections: [{ points: 4, weight: 3 }, { points: 2, weight: 1 }],
      maxScore: 10,
    });
    expect(result).toBeCloseTo(8.75, 5);
  });

  it('counts ungraded criteria toward rawMax (partial grading)', () => {
    // Only first criterion graded; rawMax = 8, rawScore = 4; 4/8*10 = 5
    const result = computeRubricScore({
      criteria,
      selections: [{ points: 4, weight: 1 }],
      maxScore: 10,
    });
    expect(result).toBe(5);
  });

  it('returns rawScore when maxScore is null', () => {
    const result = computeRubricScore({
      criteria,
      selections: [{ points: 4, weight: 1 }, { points: 3, weight: 1 }],
      maxScore: null,
    });
    expect(result).toBe(7);
  });

  it('returns 0 when rawMax is 0 (no divide-by-zero)', () => {
    const result = computeRubricScore({
      criteria: [{ weight: 0, maxPoints: 0 }],
      selections: [{ points: 0, weight: 0 }],
      maxScore: 10,
    });
    expect(result).toBe(0);
  });
});
