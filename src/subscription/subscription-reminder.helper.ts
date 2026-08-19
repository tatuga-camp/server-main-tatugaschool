const DAY_MS = 86_400_000;

export const REMINDER_STAGES = [10, 3, 1] as const;

export function computeDaysLeft(expireAt: Date, now: Date): number {
  return Math.ceil((expireAt.getTime() - now.getTime()) / DAY_MS);
}

/**
 * The deepest reminder stage due for a given daysLeft — the smallest of
 * {10, 3, 1} that is >= daysLeft. Outside (0, 10] no stage is due.
 */
export function dueStage(daysLeft: number): 10 | 3 | 1 | null {
  if (daysLeft <= 0 || daysLeft > 10) return null;
  if (daysLeft > 3) return 10;
  if (daysLeft > 1) return 3;
  return 1;
}

/**
 * Stages already sent for the CURRENT expiry date. A stored state whose
 * expiry differs (school renewed since) counts as no stages sent.
 */
export function parseReminderStages(
  raw: string | null,
  expireAt: Date,
): number[] {
  if (!raw) return [];
  const [iso, stagesPart] = raw.split('|');
  if (iso !== expireAt.toISOString() || !stagesPart) return [];
  return stagesPart
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function serializeReminderState(
  expireAt: Date,
  stages: number[],
): string {
  return `${expireAt.toISOString()}|${stages.join(',')}`;
}
