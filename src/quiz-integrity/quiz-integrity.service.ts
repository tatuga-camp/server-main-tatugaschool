// src/quiz-integrity/quiz-integrity.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { QuizAttempt } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentJwtPayload } from '../interfaces/jwt-payload';
import { QuizAccess } from '../quiz/quiz-access';
import { isPastGrace, withDefaultQuizSettings } from '../quiz/quiz-settings';
import { JEV_MIN_INTERVAL_MS } from '../quiz/quiz.constants';
import { IntegrityBatchDto } from '../quiz/dto';
import {
  detectHeartbeatGap,
  isEmptySummary,
  prepareClientEvents,
  summarizeEvents,
  summaryHash,
} from './integrity-summary';
import { updateQuizAttempt } from '../quiz/quiz-attempt-write';
import { JevClient } from './jev.client';
import { ruleRiskScore } from './risk-rules';

/** Bounds the re-check loop; each extra pass needs yet another concurrent batch. */
const MAX_RECOMPUTE_PASSES = 3;

@Injectable()
export class QuizIntegrityService {
  private readonly logger = new Logger(QuizIntegrityService.name);
  /** Per-process guard against concurrent Jev calls for one attempt. */
  private readonly running = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private access: QuizAccess,
    private jev: JevClient,
  ) {}

  async ingest(
    studentOnAssignmentId: string,
    student: StudentJwtPayload,
    dto: IntegrityBatchDto,
  ): Promise<{ ok: true }> {
    const { soa, assignment } = await this.access.studentQuiz(
      studentOnAssignmentId,
      student,
    );
    const settings = withDefaultQuizSettings(assignment.quizSettings);
    const attempt = soa.quizAttempt;
    if (!settings.testMode || !attempt || attempt.submittedAt)
      return { ok: true };

    const now = new Date();
    // Past deadline + grace the attempt is due for finalization (GET/answer/
    // submit or the monitor do it); late exits must not raise the risk score.
    if (isPastGrace(attempt.deadlineAt, now)) return { ok: true };

    const prepared = prepareClientEvents(
      dto.events ?? [],
      now,
      attempt.startedAt,
    );
    const gapMs = dto.heartbeat
      ? detectHeartbeatGap(attempt.lastSeenAt, now, prepared)
      : null;
    const rows = [
      ...prepared,
      ...(gapMs !== null
        ? [
            {
              type: 'HEARTBEAT_GAP' as const,
              clientAt: now,
              serverAt: now,
              durationMs: gapMs,
            },
          ]
        : []),
    ];

    if (rows.length === 0) {
      const exists = await updateQuizAttempt(this.prisma, soa.id, {
        lastSeenAt: now,
      });
      if (exists && this.isJevDue(attempt, now))
        void this.evaluateWithJev(soa.id);
      return { ok: true };
    }

    await this.prisma.quizIntegrityEvent.createMany({
      data: rows.map((row) => ({
        ...row,
        studentOnAssignmentId: soa.id,
        assignmentId: soa.assignmentId,
        subjectId: soa.subjectId,
        schoolId: soa.schoolId,
      })),
    });
    const summary = await this.recomputeSummary(
      soa.id,
      attempt.integritySummary,
      now,
    );
    if (!summary) return { ok: true }; // attempt reset by the teacher mid-batch

    if (this.isJevDue({ ...attempt, integritySummary: summary }, now)) {
      void this.evaluateWithJev(soa.id);
    }
    return { ok: true };
  }

  /**
   * Recomputes the summary from all stored events and writes it with the rule
   * score. The write is last-writer-wins, so a batch whose findMany ran before
   * a concurrent batch's createMany could overwrite a fresher summary. After
   * each write we re-count the stored events: if more arrived than the
   * summary covered, recompute and write again until stable. Any stale write
   * is therefore followed by a write that includes every event stored before
   * it. Returns null when the attempt no longer exists (teacher reset).
   */
  private async recomputeSummary(
    studentOnAssignmentId: string,
    previous: QuizAttempt['integritySummary'],
    now: Date,
  ): Promise<QuizAttempt['integritySummary'] | null> {
    let lastWritten = previous;
    for (let pass = 0; pass < MAX_RECOMPUTE_PASSES; pass++) {
      const events = await this.prisma.quizIntegrityEvent.findMany({
        where: { studentOnAssignmentId },
        select: { type: true, durationMs: true },
      });
      const summary = summarizeEvents(events);
      const changed = summaryHash(summary) !== summaryHash(lastWritten);
      if (pass > 0 && !changed) return summary;
      const exists = await updateQuizAttempt(
        this.prisma,
        studentOnAssignmentId,
        {
          ...(pass === 0 && { lastSeenAt: now }),
          ...(changed && {
            integritySummary: { set: summary },
            riskScore: ruleRiskScore(summary),
            riskSource: 'RULE' as const,
            riskPattern: null,
            riskConfidence: null,
          }),
        },
      );
      if (!exists) return null;
      lastWritten = summary;
      const stored = await this.prisma.quizIntegrityEvent.count({
        where: { studentOnAssignmentId },
      });
      if (stored === events.length) return summary;
    }
    return lastWritten;
  }

  private isJevDue(attempt: QuizAttempt, now: Date): boolean {
    if (!this.jev.isEnabled() || isEmptySummary(attempt.integritySummary))
      return false;
    if (summaryHash(attempt.integritySummary) === attempt.riskInputHash)
      return false;
    return (
      !attempt.riskCheckedAt ||
      now.getTime() - attempt.riskCheckedAt.getTime() >= JEV_MIN_INTERVAL_MS
    );
  }

  /** Fire-and-forget safe: never throws. */
  async evaluateWithJev(studentOnAssignmentId: string): Promise<void> {
    if (!this.jev.isEnabled() || this.running.has(studentOnAssignmentId))
      return;
    this.running.add(studentOnAssignmentId);
    try {
      const soa = await this.prisma.studentOnAssignment.findUnique({
        where: { id: studentOnAssignmentId },
        include: { assignment: true },
      });
      const attempt = soa?.quizAttempt;
      if (!soa || !attempt || isEmptySummary(attempt.integritySummary)) return;

      const hash = summaryHash(attempt.integritySummary);
      const [questionCount, answeredCount] = await Promise.all([
        this.prisma.assignmentOnQuiz.count({
          where: { assignmentId: soa.assignmentId },
        }),
        this.prisma.studentOnQuiz.count({ where: { studentOnAssignmentId } }),
      ]);
      const end = attempt.submittedAt ?? new Date();
      const verdict = await this.jev.evaluate({
        summary: attempt.integritySummary,
        questionCount,
        answeredCount,
        timeLimitMinutes: soa.assignment.quizSettings?.timeLimitMinutes ?? null,
        elapsedMs: end.getTime() - attempt.startedAt.getTime(),
      });

      const fresh = await this.prisma.studentOnAssignment.findUnique({
        where: { id: studentOnAssignmentId },
        select: { quizAttempt: true },
      });
      if (!fresh?.quizAttempt) return; // reset meanwhile
      const stillCurrent =
        summaryHash(fresh.quizAttempt.integritySummary) === hash;
      const checkedAt = new Date();

      await updateQuizAttempt(
        this.prisma,
        studentOnAssignmentId,
        verdict && stillCurrent
          ? {
              riskScore: verdict.riskScore,
              riskSource: 'JEV',
              riskPattern: verdict.pattern,
              riskConfidence: verdict.confidence,
              riskCheckedAt: checkedAt,
              riskInputHash: hash,
            }
          : { riskCheckedAt: checkedAt },
      );
    } catch (error) {
      this.logger.error(
        `Jev evaluation failed for ${studentOnAssignmentId}: ${(error as Error).message}`,
      );
    } finally {
      this.running.delete(studentOnAssignmentId);
    }
  }
}
