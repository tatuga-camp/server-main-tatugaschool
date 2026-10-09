// src/quiz/quiz.constants.ts
import { QuizSettings } from '@prisma/client';

export const QUIZ_GRACE_MS = 30_000;
export const HEARTBEAT_GAP_MS = 25_000;
export const AWAY_STALE_MS = 25_000;
export const JEV_MIN_INTERVAL_MS = 45_000;
export const JEV_TIMEOUT_MS = 5_000;
export const MAX_EVENTS_PER_BATCH = 200;
export const MIN_EXIT_MS = 1_000;
export const MAX_REVIEW_EVENTS = 500;

/** Client-generated option / blank ids (nanoid-style). */
export const QUIZ_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
/** `{{blankId}}` tokens inside a FILL_BLANK prompt. Always use with matchAll / a fresh RegExp. */
export const BLANK_TOKEN_SOURCE = '\\{\\{([A-Za-z0-9_-]{1,32})\\}\\}';

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  scoringMode: 'ALL_OR_NOTHING',
  timeLimitMinutes: null,
  shuffleQuestions: false,
  shuffleOptions: false,
  testMode: false,
  showAnswersAfterSubmit: false,
};
