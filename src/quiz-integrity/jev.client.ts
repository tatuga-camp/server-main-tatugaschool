// src/quiz-integrity/jev.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { QuizIntegritySummary, QuizRiskPattern } from '@prisma/client';
import { JEV_TIMEOUT_MS } from '../quiz/quiz.constants';

export const JEV_URL = 'https://api.typesafe.ai/v1/systemone';

export type JevInput = {
  summary: QuizIntegritySummary;
  questionCount: number;
  answeredCount: number;
  timeLimitMinutes: number | null;
  elapsedMs: number;
};

export type JevVerdict = {
  riskScore: number;
  pattern: QuizRiskPattern | null;
  confidence: number | null;
};

const PATTERN_BY_CHOICE: Record<string, QuizRiskPattern> = {
  normal: 'NORMAL',
  connectivity: 'CONNECTIVITY',
  distracted: 'DISTRACTED',
  outside_help: 'OUTSIDE_HELP',
};

const seconds = (ms: number) => Math.round(ms / 1000);

export function buildJevRequest(input: JevInput) {
  const s = input.summary;
  return {
    model: 'jev-latest',
    state: {
      context:
        "Integrity signals from one student's online school quiz, collected from browser events. " +
        'Brief exits (a notification, a low-battery popup) are common and usually innocent.',
      questionCount: input.questionCount,
      answeredCount: input.answeredCount,
      timeLimitMinutes: input.timeLimitMinutes,
      elapsedMinutes: Math.round(input.elapsedMs / 6_000) / 10,
      exitsLongerThan1s: s.exitCount,
      totalSecondsAway: seconds(s.totalAwayMs),
      longestSecondsAway: seconds(s.longestAwayMs),
      windowFocusLosses: s.blurCount,
      translatorDetected: s.translateDetected,
      pasteAttempts: s.pasteAttempts,
      copyAttempts: s.copyAttempts,
      fullscreenExits: s.fullscreenExits,
      screenshotKeyPresses: s.screenshotKeyCount,
      connectionGaps: s.heartbeatGapCount,
      longestConnectionGapSeconds: seconds(s.longestHeartbeatGapMs),
    },
    questions: {
      outside_help: {
        type: 'noul',
        instructions:
          'Did the student likely use outside help (another app, a translator, AI, or another person) during this quiz?',
        criteria: {
          true: 'Repeated or long absences, translation, pasting, or screenshots consistent with looking things up',
          false: 'No signals, or only brief interruptions consistent with innocent causes',
        },
      },
      pattern: {
        type: 'choice',
        instructions: 'Which pattern best describes these signals?',
        criteria: {
          normal: 'Few or no signals; ordinary test-taking',
          connectivity: 'Mostly connection gaps rather than leaving the page',
          distracted: 'Some short exits or focus losses without signs of copying or lookup',
          outside_help: 'Long or repeated absences, translation, pasting, or screenshots suggesting lookup',
        },
      },
    },
  };
}

export function parseJevResponse(body: unknown): JevVerdict | null {
  const answers = (body as { answers?: Record<string, any> } | null)?.answers;
  const noul = answers?.outside_help?.noul;
  if (typeof noul !== 'number' || !Number.isFinite(noul)) return null;
  const choice = answers?.pattern?.choice;
  const confidence = answers?.pattern?.confidence;
  return {
    riskScore: Math.min(100, Math.max(0, Math.round(noul * 100))),
    pattern: typeof choice === 'string' ? (PATTERN_BY_CHOICE[choice] ?? null) : null,
    confidence: typeof confidence === 'number' ? confidence : null,
  };
}

@Injectable()
export class JevClient {
  private readonly logger = new Logger(JevClient.name);

  isEnabled(): boolean {
    return !!process.env.TYPESAFE_AI_API_KEY;
  }

  /** Never throws: any failure returns null and the caller keeps the rule score. */
  async evaluate(input: JevInput): Promise<JevVerdict | null> {
    const key = process.env.TYPESAFE_AI_API_KEY;
    if (!key) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), JEV_TIMEOUT_MS);
    try {
      const response = await fetch(JEV_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildJevRequest(input)),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(`Jev responded ${response.status}`);
        return null;
      }
      return parseJevResponse(await response.json());
    } catch (error) {
      // Log the error name only: never the payload.
      this.logger.warn(`Jev call failed: ${(error as Error).name}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
