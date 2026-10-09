import { QuizSettings } from '@prisma/client';
import { DEFAULT_QUIZ_SETTINGS, QUIZ_GRACE_MS } from './quiz.constants';

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function withDefaultQuizSettings(
  patch?: Partial<QuizSettings> | null,
): QuizSettings {
  return { ...DEFAULT_QUIZ_SETTINGS, ...definedOnly(patch ?? {}) };
}

export function mergeQuizSettings(
  existing: QuizSettings | null | undefined,
  patch: Partial<QuizSettings>,
): QuizSettings {
  return {
    ...DEFAULT_QUIZ_SETTINGS,
    ...definedOnly(existing ?? {}),
    ...definedOnly(patch),
  };
}

export function computeDeadline(
  startedAt: Date,
  timeLimitMinutes: number | null | undefined,
  dueDate: Date | null | undefined,
): Date | null {
  const candidates: number[] = [];
  if (timeLimitMinutes) candidates.push(startedAt.getTime() + timeLimitMinutes * 60_000);
  if (dueDate) candidates.push(dueDate.getTime());
  return candidates.length > 0 ? new Date(Math.min(...candidates)) : null;
}

export function isPastGrace(deadlineAt: Date | null | undefined, now: Date): boolean {
  return !!deadlineAt && now.getTime() > deadlineAt.getTime() + QUIZ_GRACE_MS;
}
