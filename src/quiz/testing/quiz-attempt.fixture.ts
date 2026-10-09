import { QuizAttempt } from '@prisma/client';

/** A fully populated attempt, including every integrity and risk field a student must never receive. */
export const fullQuizAttempt = (): QuizAttempt => ({
  startedAt: new Date('2026-10-09T08:00:00Z'),
  deadlineAt: new Date('2026-10-09T08:30:00Z'),
  submittedAt: new Date('2026-10-09T08:20:00Z'),
  lastSeenAt: new Date('2026-10-09T08:19:00Z'),
  shuffleSeed: 12345,
  integritySummary: {
    exitCount: 3,
    totalAwayMs: 60000,
    longestAwayMs: 30000,
    blurCount: 4,
    translateDetected: true,
    pasteAttempts: 2,
    copyAttempts: 1,
    fullscreenExits: 1,
    screenshotKeyCount: 0,
    heartbeatGapCount: 0,
    longestHeartbeatGapMs: 0,
  },
  riskScore: 0.9,
  riskSource: 'JEV',
  riskPattern: 'OUTSIDE_HELP',
  riskConfidence: 0.8,
  riskCheckedAt: new Date('2026-10-09T08:21:00Z'),
  riskInputHash: 'hash',
});

const FORBIDDEN = /^(risk|integritySummary$|shuffleSeed$|lastSeenAt$)/;

/** Deep-scans a response for keys that carry integrity or risk data; returns every offending path. */
export function leakedIntegrityKeys(value: unknown, path = '$'): string[] {
  if (value === null || typeof value !== 'object' || value instanceof Date) return [];
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leakedIntegrityKeys(v, `${path}[${i}]`));
  }
  return Object.entries(value).flatMap(([key, v]) => [
    ...(FORBIDDEN.test(key) ? [`${path}.${key}`] : []),
    ...leakedIntegrityKeys(v, `${path}.${key}`),
  ]);
}
