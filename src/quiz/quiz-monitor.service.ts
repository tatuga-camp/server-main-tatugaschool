// src/quiz/quiz-monitor.service.ts
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AssignmentOnQuiz,
  QuizIntegrityEventType,
  QuizIntegritySummary,
  QuizRiskPattern,
  QuizRiskSource,
  QuizScoringMode,
  StudentOnAssignment,
  StudentOnQuiz,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { AWAY_EVENT_TYPES, RETURN_EVENT_TYPES } from '../quiz-integrity/integrity-summary';
import { deriveMonitorStatus, QuizMonitorStatus } from '../quiz-integrity/monitor-status';
import { sumScores } from './grading';
import { isQuizLocked, QuizAccess } from './quiz-access';
import { QuizAttemptService } from './quiz-attempt.service';
import { isPastGrace, withDefaultQuizSettings } from './quiz-settings';
import { MAX_REVIEW_EVENTS } from './quiz.constants';
import { isAnswered } from './student-question.mapper';
import { OverrideQuizScoreDto } from './dto';

export type QuizMonitorRow = {
  studentOnAssignmentId: string;
  studentId: string;
  title: string;
  firstName: string;
  lastName: string;
  number: string;
  photo: string;
  blurHash: string | null;
  status: QuizMonitorStatus;
  answeredCount: number;
  questionCount: number;
  startedAt: Date | null;
  submittedAt: Date | null;
  lastSeenAt: Date | null;
  score: number | null;
  integritySummary: QuizIntegritySummary | null;
  riskScore: number | null;
  riskSource: QuizRiskSource | null;
  riskPattern: QuizRiskPattern | null;
  riskConfidence: number | null;
};

export type QuizMonitorView = {
  assignmentId: string;
  testMode: boolean;
  /** True once any row (assigned or not) has an attempt; same rule as the edit guard. */
  locked: boolean;
  questionCount: number;
  serverNow: string;
  rows: QuizMonitorRow[];
};

export type QuizReviewView = {
  studentOnAssignment: StudentOnAssignment;
  maxScore: number | null;
  scoringMode: QuizScoringMode;
  testMode: boolean;
  items: { question: AssignmentOnQuiz; answer: StudentOnQuiz | null }[];
  events: {
    id: string;
    type: QuizIntegrityEventType;
    serverAt: Date;
    clientAt: Date;
    durationMs: number | null;
  }[];
};

const AWAY_RETURN_TYPES: QuizIntegrityEventType[] = [...AWAY_EVENT_TYPES, ...RETURN_EVENT_TYPES];
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class QuizMonitorService {
  private readonly logger = new Logger(QuizMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private access: QuizAccess,
    private attempts: QuizAttemptService,
    private cache: CacheService,
  ) {}

  /** Uncached on purpose: the teacher refetches every 10 s. */
  async getMonitor(assignmentId: string, user: UserJwtPayload): Promise<QuizMonitorView> {
    const assignment = await this.access.teacherAssignment(assignmentId, user);
    const settings = withDefaultQuizSettings(assignment.quizSettings);
    const now = new Date();

    const fetched = await this.prisma.studentOnAssignment.findMany({
      where: { assignmentId, isAssigned: true },
    });
    // Finalize expired attempts in parallel. A failure (e.g. a teacher reset
    // racing the finalize) keeps the fetched row instead of failing the poll.
    const rows = await Promise.all(
      fetched.map(async (row) => {
        const attempt = row.quizAttempt;
        if (!attempt || attempt.submittedAt || !isPastGrace(attempt.deadlineAt, now)) return row;
        try {
          return await this.attempts.finalizeAttempt(row.id);
        } catch (error) {
          this.logger.warn(`finalize on monitor fetch failed for ${row.id}: ${(error as Error)?.message}`);
          return row;
        }
      }),
    );

    const [questionCount, locked, answers, events] = await Promise.all([
      this.prisma.assignmentOnQuiz.count({ where: { assignmentId } }),
      isQuizLocked(this.prisma, assignmentId),
      this.prisma.studentOnQuiz.findMany({
        where: { assignmentId },
        select: { studentOnAssignmentId: true, selectedOptionIds: true, blankAnswers: true },
      }),
      settings.testMode
        ? this.prisma.quizIntegrityEvent.findMany({
            where: {
              assignmentId,
              type: { in: AWAY_RETURN_TYPES },
              serverAt: { gte: new Date(now.getTime() - SIX_HOURS_MS) },
            },
            orderBy: [{ serverAt: 'desc' }, { clientAt: 'desc' }],
            select: { studentOnAssignmentId: true, type: true },
          })
        : Promise.resolve([]),
    ]);

    const answered = new Map<string, number>();
    for (const a of answers) {
      if (isAnswered(a)) {
        answered.set(a.studentOnAssignmentId, (answered.get(a.studentOnAssignmentId) ?? 0) + 1);
      }
    }
    const lastAwayReturn = new Map<string, QuizIntegrityEventType>();
    for (const e of events) {
      if (!lastAwayReturn.has(e.studentOnAssignmentId)) lastAwayReturn.set(e.studentOnAssignmentId, e.type);
    }

    return {
      assignmentId,
      testMode: settings.testMode,
      locked,
      questionCount,
      serverNow: now.toISOString(),
      rows: rows.map((s) => {
        const attempt = s.quizAttempt;
        return {
          studentOnAssignmentId: s.id,
          studentId: s.studentId,
          title: s.title,
          firstName: s.firstName,
          lastName: s.lastName,
          number: s.number,
          photo: s.photo,
          blurHash: s.blurHash ?? null,
          status: deriveMonitorStatus({
            attempt: attempt ? { submittedAt: attempt.submittedAt ?? null, lastSeenAt: attempt.lastSeenAt } : null,
            lastAwayReturnType: lastAwayReturn.get(s.id) ?? null,
            testMode: settings.testMode,
            now,
          }),
          answeredCount: answered.get(s.id) ?? 0,
          questionCount,
          startedAt: attempt?.startedAt ?? null,
          submittedAt: attempt?.submittedAt ?? null,
          lastSeenAt: attempt?.lastSeenAt ?? null,
          score: s.score ?? null,
          integritySummary: settings.testMode ? (attempt?.integritySummary ?? null) : null,
          riskScore: settings.testMode ? (attempt?.riskScore ?? null) : null,
          riskSource: settings.testMode ? (attempt?.riskSource ?? null) : null,
          riskPattern: settings.testMode ? (attempt?.riskPattern ?? null) : null,
          riskConfidence: settings.testMode ? (attempt?.riskConfidence ?? null) : null,
        };
      }),
    };
  }

  async getReview(studentOnAssignmentId: string, user: UserJwtPayload): Promise<QuizReviewView> {
    const { soa, assignment } = await this.access.teacherStudentOnAssignment(studentOnAssignmentId, user);
    const settings = withDefaultQuizSettings(assignment.quizSettings);
    const [questions, answers, events] = await Promise.all([
      this.prisma.assignmentOnQuiz.findMany({ where: { assignmentId: assignment.id }, orderBy: { order: 'asc' } }),
      this.prisma.studentOnQuiz.findMany({ where: { studentOnAssignmentId } }),
      this.prisma.quizIntegrityEvent.findMany({
        where: { studentOnAssignmentId },
        orderBy: [{ serverAt: 'asc' }, { clientAt: 'asc' }],
        take: MAX_REVIEW_EVENTS,
        select: { id: true, type: true, serverAt: true, clientAt: true, durationMs: true },
      }),
    ]);
    const byQuestion = new Map(answers.map((a) => [a.assignmentOnQuizId, a]));
    return {
      studentOnAssignment: soa,
      maxScore: assignment.maxScore,
      scoringMode: settings.scoringMode,
      testMode: settings.testMode,
      items: questions.map((question) => ({ question, answer: byQuestion.get(question.id) ?? null })),
      events,
    };
  }

  async overrideScore(
    studentOnQuizId: string,
    dto: OverrideQuizScoreDto,
    user: UserJwtPayload,
  ): Promise<{ studentOnQuizId: string; score: number; total: number }> {
    const answer = await this.prisma.studentOnQuiz.findUnique({
      where: { id: studentOnQuizId },
      include: { assignmentOnQuiz: true },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    const { soa } = await this.access.teacherStudentOnAssignment(answer.studentOnAssignmentId, user);
    // Only submitted attempts: the student could still change an answer the
    // teacher never saw, and finalize would keep the overridden score.
    if (!soa.quizAttempt?.submittedAt) throw new ConflictException('QUIZ_NOT_SUBMITTED');
    if (dto.score > answer.assignmentOnQuiz.points) {
      throw new BadRequestException('Score cannot exceed the question points');
    }
    // updateMany, not update: a concurrent reset may have deleted the answer,
    // which should be a 404 rather than a P2025 500.
    const { count } = await this.prisma.studentOnQuiz.updateMany({
      where: { id: studentOnQuizId },
      data: { score: dto.score, teacherOverridden: true },
    });
    if (count === 0) throw new NotFoundException('Answer not found');
    const all = await this.prisma.studentOnQuiz.findMany({
      where: { studentOnAssignmentId: soa.id },
      select: { score: true },
    });
    const total = sumScores(all.map((a) => a.score ?? 0));
    await this.prisma.studentOnAssignment.update({ where: { id: soa.id }, data: { score: total } });
    await this.cache.bump(subjectScope(soa.subjectId, 'submissions'), subjectScope(soa.subjectId, 'grades'));
    return { studentOnQuizId, score: dto.score, total };
  }

  async reset(studentOnAssignmentId: string, user: UserJwtPayload): Promise<StudentOnAssignment> {
    const { soa } = await this.access.teacherStudentOnAssignment(studentOnAssignmentId, user);
    // Unset the attempt FIRST: guarded writes (saveAnswer, integrity batches,
    // finalize) then fail with QUIZ_NOT_STARTED, so no write from the old
    // attempt can land after the deletes below and survive the reset.
    const updated = await this.prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { quizAttempt: { unset: true }, status: 'PENDDING', score: null, completedAt: null },
    });
    await Promise.all([
      this.prisma.studentOnQuiz.deleteMany({ where: { studentOnAssignmentId: soa.id } }),
      this.prisma.quizIntegrityEvent.deleteMany({ where: { studentOnAssignmentId: soa.id } }),
    ]);
    await this.cache.bump(subjectScope(soa.subjectId, 'submissions'), subjectScope(soa.subjectId, 'grades'));
    return updated;
  }
}
