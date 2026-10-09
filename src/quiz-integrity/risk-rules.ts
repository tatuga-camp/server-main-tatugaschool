// src/quiz-integrity/risk-rules.ts
import { QuizIntegritySummary } from '@prisma/client';

/** Weights from the spec. One short exit stays Low; the first exit is free. */
export function ruleRiskScore(s: QuizIntegritySummary): number {
  let score = 0;
  score += Math.max(0, s.exitCount - 1) * 8;
  score += Math.min(30, s.totalAwayMs / 1000 / 4);
  score += s.longestAwayMs > 30_000 ? 15 : 0;
  score += s.translateDetected ? 25 : 0;
  score += Math.min(20, s.pasteAttempts * 10);
  score += Math.min(20, s.screenshotKeyCount * 10);
  score += Math.min(10, s.heartbeatGapCount * 5);
  return Math.min(100, Math.round(score));
}
