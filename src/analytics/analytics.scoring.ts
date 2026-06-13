// Pure risk-scoring math. No I/O — fully unit tested in analytics.scoring.spec.ts.
// Tune behaviour by editing the constants below.

export const RISK_WEIGHTS = {
  missing: 0.4,
  lowScore: 0.3,
  attendance: 0.3,
} as const;

export const TIER_THRESHOLDS = {
  high: 60,
  medium: 35,
} as const;

export type RiskTier = 'HIGH' | 'MEDIUM' | 'LOW';

export type StudentSignals = {
  missing: { overdueUnsubmitted: number; assignedPublished: number };
  avgScorePercent: number | null; // null = no graded work yet
  attendance: { absentCount: number; totalRecords: number };
};

const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

export function missingSubScore(input: {
  overdueUnsubmitted: number;
  assignedPublished: number;
}): number | null {
  if (input.assignedPublished <= 0) return null;
  return (input.overdueUnsubmitted / input.assignedPublished) * 100;
}

export function lowScoreSubScore(avgScorePercent: number | null): number | null {
  if (avgScorePercent === null) return null;
  return clamp(100 - avgScorePercent, 0, 100);
}

export function attendanceSubScore(input: {
  absentCount: number;
  totalRecords: number;
}): number | null {
  if (input.totalRecords <= 0) return null;
  return (input.absentCount / input.totalRecords) * 100;
}

export function computeRiskScore(signals: StudentSignals): {
  score: number;
  limitedData: boolean;
} {
  const parts: Array<{ value: number; weight: number }> = [];

  const missing = missingSubScore(signals.missing);
  if (missing !== null) parts.push({ value: missing, weight: RISK_WEIGHTS.missing });

  const low = lowScoreSubScore(signals.avgScorePercent);
  if (low !== null) parts.push({ value: low, weight: RISK_WEIGHTS.lowScore });

  const attend = attendanceSubScore(signals.attendance);
  if (attend !== null) parts.push({ value: attend, weight: RISK_WEIGHTS.attendance });

  const limitedData = parts.length < 3;

  if (parts.length === 0) return { score: 0, limitedData: true };

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const weighted = parts.reduce((sum, p) => sum + p.value * (p.weight / totalWeight), 0);

  return { score: Math.round(weighted), limitedData };
}

export function tierFor(score: number): RiskTier {
  if (score >= TIER_THRESHOLDS.high) return 'HIGH';
  if (score >= TIER_THRESHOLDS.medium) return 'MEDIUM';
  return 'LOW';
}
