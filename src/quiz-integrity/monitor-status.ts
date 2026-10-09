// src/quiz-integrity/monitor-status.ts
import { QuizIntegrityEventType } from '@prisma/client';
import { AWAY_STALE_MS } from '../quiz/quiz.constants';
import { AWAY_EVENT_TYPES } from './integrity-summary';

export type QuizMonitorStatus = 'NOT_STARTED' | 'ANSWERING' | 'AWAY' | 'SUBMITTED';

export function deriveMonitorStatus(input: {
  attempt: { submittedAt: Date | null; lastSeenAt: Date } | null;
  lastAwayReturnType: QuizIntegrityEventType | null;
  testMode: boolean;
  now: Date;
}): QuizMonitorStatus {
  if (!input.attempt) return 'NOT_STARTED';
  if (input.attempt.submittedAt) return 'SUBMITTED';
  if (!input.testMode) return 'ANSWERING';
  if (input.lastAwayReturnType && AWAY_EVENT_TYPES.has(input.lastAwayReturnType)) return 'AWAY';
  if (input.now.getTime() - input.attempt.lastSeenAt.getTime() > AWAY_STALE_MS) return 'AWAY';
  return 'ANSWERING';
}
