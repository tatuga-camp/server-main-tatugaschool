// src/quiz-integrity/integrity-summary.ts
import { QuizIntegrityEventType, QuizIntegritySummary } from '@prisma/client';
import { HEARTBEAT_GAP_MS, MIN_EXIT_MS } from '../quiz/quiz.constants';

type T = QuizIntegrityEventType;

export const CLIENT_EVENT_TYPES: ReadonlySet<T> = new Set<T>([
  'HIDDEN', 'VISIBLE', 'BLUR', 'FOCUS', 'TRANSLATE_DETECTED', 'COPY_ATTEMPT',
  'PASTE_ATTEMPT', 'FULLSCREEN_EXIT', 'SCREENSHOT_KEY', 'PAGE_HIDE', 'PAGE_SHOW',
]);
export const AWAY_EVENT_TYPES: ReadonlySet<T> = new Set<T>(['HIDDEN', 'BLUR', 'PAGE_HIDE']);
export const RETURN_EVENT_TYPES: ReadonlySet<T> = new Set<T>(['VISIBLE', 'FOCUS', 'PAGE_SHOW']);
export const DURATION_EVENT_TYPES: ReadonlySet<T> = new Set<T>(['VISIBLE', 'FOCUS']);

export type ClientEvent = { type: T; clientAt: string; durationMs?: number };
export type PreparedEvent = { type: T; clientAt: Date; serverAt: Date; durationMs: number | null };

export function prepareClientEvents(events: ClientEvent[], now: Date, startedAt: Date): PreparedEvent[] {
  const maxMs = Math.max(0, now.getTime() - startedAt.getTime());
  return events
    .filter((e) => CLIENT_EVENT_TYPES.has(e.type))
    .map((e) => {
      const parsed = new Date(e.clientAt);
      const clientAt = Number.isNaN(parsed.getTime()) ? now : parsed;
      const durationMs =
        DURATION_EVENT_TYPES.has(e.type) && typeof e.durationMs === 'number'
          ? Math.min(Math.max(0, Math.round(e.durationMs)), maxMs)
          : null;
      return { type: e.type, clientAt, serverAt: now, durationMs };
    });
}

export function detectHeartbeatGap(lastSeenAt: Date, now: Date, batch: { type: T }[]): number | null {
  const gap = now.getTime() - lastSeenAt.getTime();
  if (gap <= HEARTBEAT_GAP_MS) return null;
  if (batch.some((e) => RETURN_EVENT_TYPES.has(e.type))) return null;
  return gap;
}

export function emptySummary(): QuizIntegritySummary {
  return {
    exitCount: 0,
    totalAwayMs: 0,
    longestAwayMs: 0,
    blurCount: 0,
    translateDetected: false,
    pasteAttempts: 0,
    copyAttempts: 0,
    fullscreenExits: 0,
    screenshotKeyCount: 0,
    heartbeatGapCount: 0,
    longestHeartbeatGapMs: 0,
  };
}

export function summarizeEvents(events: { type: T; durationMs: number | null }[]): QuizIntegritySummary {
  const s = emptySummary();
  for (const e of events) {
    const d = e.durationMs ?? 0;
    switch (e.type) {
      case 'VISIBLE':
      case 'FOCUS':
        if (e.type === 'FOCUS') s.blurCount += 1;
        if (d >= MIN_EXIT_MS) {
          s.exitCount += 1;
          s.totalAwayMs += d;
          s.longestAwayMs = Math.max(s.longestAwayMs, d);
        }
        break;
      case 'TRANSLATE_DETECTED':
        s.translateDetected = true;
        break;
      case 'PASTE_ATTEMPT':
        s.pasteAttempts += 1;
        break;
      case 'COPY_ATTEMPT':
        s.copyAttempts += 1;
        break;
      case 'FULLSCREEN_EXIT':
        s.fullscreenExits += 1;
        break;
      case 'SCREENSHOT_KEY':
        s.screenshotKeyCount += 1;
        break;
      case 'HEARTBEAT_GAP':
        s.heartbeatGapCount += 1;
        s.longestHeartbeatGapMs = Math.max(s.longestHeartbeatGapMs, d);
        break;
      default:
        break;
    }
  }
  return s;
}

const SUMMARY_KEYS = Object.keys(emptySummary()) as (keyof QuizIntegritySummary)[];

export function summaryHash(summary: QuizIntegritySummary): string {
  return SUMMARY_KEYS.map((k) => `${k}=${Number(summary[k])}`).join('|');
}

export function isEmptySummary(summary: QuizIntegritySummary): boolean {
  return summaryHash(summary) === summaryHash(emptySummary());
}
