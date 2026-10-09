// src/quiz-integrity/jev.client.ts
import { Injectable, Logger } from '@nestjs/common';
import { QuizIntegritySummary, QuizRiskPattern } from '@prisma/client';
import { APIError, choice, noul, TypeSafeClient } from '@typesafe-ai/sdk';
import { JEV_TIMEOUT_MS } from '../quiz/quiz.constants';

export const JEV_MODEL = 'jev-latest';

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
    model: JEV_MODEL,
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
      outside_help: noul(
        'Did the student likely use outside help (another app, a translator, AI, or another person) during this quiz?',
        {
          true: 'Repeated or long absences, translation, pasting, or screenshots consistent with looking things up',
          false:
            'No signals, or only brief interruptions consistent with innocent causes',
        },
      ),
      pattern: choice('Which pattern best describes these signals?', {
        normal: 'Few or no signals; ordinary test-taking',
        connectivity: 'Mostly connection gaps rather than leaving the page',
        distracted:
          'Some short exits or focus losses without signs of copying or lookup',
        outside_help:
          'Long or repeated absences, translation, pasting, or screenshots suggesting lookup',
      }),
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
    pattern:
      typeof choice === 'string' ? (PATTERN_BY_CHOICE[choice] ?? null) : null,
    confidence: typeof confidence === 'number' ? confidence : null,
  };
}

@Injectable()
export class JevClient {
  private readonly logger = new Logger(JevClient.name);
  private client: { apiKey: string; sdk: TypeSafeClient } | null = null;

  isEnabled(): boolean {
    return !!process.env.TYPESAFE_AI_API_KEY;
  }

  /** The SDK constructor throws without a key, so build it only once a key is set. */
  private sdkFor(apiKey: string): TypeSafeClient {
    if (this.client?.apiKey !== apiKey) {
      this.client = {
        apiKey,
        sdk: new TypeSafeClient({
          apiKey,
          timeout: JEV_TIMEOUT_MS,
          // The caller re-evaluates on a later integrity batch, so a retry here only delays it.
          retry: { maxRetries: 0 },
          // Debug logging would print request bodies; failures are logged below instead.
          logLevel: 'off',
        }),
      };
    }
    return this.client.sdk;
  }

  /** Never throws: any failure returns null and the caller keeps the rule score. */
  async evaluate(input: JevInput): Promise<JevVerdict | null> {
    const key = process.env.TYPESAFE_AI_API_KEY;
    if (!key) return null;
    try {
      const result = await this.sdkFor(key).systemOne(buildJevRequest(input));
      return parseJevResponse(result);
    } catch (error) {
      // Log the status or error name only: never the payload.
      if (error instanceof APIError) {
        this.logger.warn(
          `Jev responded ${error.status}${error.requestId ? ` (request ${error.requestId})` : ''}`,
        );
      } else {
        this.logger.warn(`Jev call failed: ${(error as Error).name}`);
      }
      return null;
    }
  }
}
