// src/quiz/quiz-attempt.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { QuizIntegrityService } from '../quiz-integrity/quiz-integrity.service';
import { gradeQuestion, sumScores } from './grading';
import { updateQuizAttempt } from './quiz-attempt-write';
import { withDefaultQuizSettings } from './quiz-settings';

@Injectable()
export class QuizAttemptService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private integrity: QuizIntegrityService,
  ) {}

  /** Grades and submits. Idempotent: a submitted attempt is returned as-is. */
  async finalizeAttempt(studentOnAssignmentId: string): Promise<StudentOnAssignment> {
    const found = await this.prisma.studentOnAssignment.findUnique({
      where: { id: studentOnAssignmentId },
      include: { assignment: true },
    });
    if (!found || !found.quizAttempt) throw new NotFoundException('Quiz attempt not found');
    const { assignment, ...soa } = found;
    if (soa.quizAttempt.submittedAt) return soa;

    const settings = withDefaultQuizSettings(assignment.quizSettings);
    const [questions, answers] = await Promise.all([
      this.prisma.assignmentOnQuiz.findMany({ where: { assignmentId: soa.assignmentId } }),
      this.prisma.studentOnQuiz.findMany({ where: { studentOnAssignmentId: soa.id } }),
    ]);
    const byQuestion = new Map(answers.map((a) => [a.assignmentOnQuizId, a]));

    const scores: number[] = [];
    const writes: Promise<unknown>[] = [];
    for (const question of questions) {
      const answer = byQuestion.get(question.id);
      if (!answer) {
        scores.push(0);
        writes.push(
          ignoreUniqueViolation(
            this.prisma.studentOnQuiz.upsert({
              where: {
                studentOnAssignmentId_assignmentOnQuizId: {
                  studentOnAssignmentId: soa.id,
                  assignmentOnQuizId: question.id,
                },
              },
              create: {
                selectedOptionIds: [],
                blankAnswers: [],
                score: 0,
                assignmentOnQuizId: question.id,
                studentOnAssignmentId: soa.id,
                assignmentId: soa.assignmentId,
                studentId: soa.studentId,
                subjectId: soa.subjectId,
                schoolId: soa.schoolId,
              },
              update: {},
            }),
          ),
        );
        continue;
      }
      if (answer.teacherOverridden && answer.score !== null) {
        scores.push(answer.score);
        continue;
      }
      const score = gradeQuestion(question, answer, settings.scoringMode);
      scores.push(score);
      writes.push(this.prisma.studentOnQuiz.update({ where: { id: answer.id }, data: { score } }));
    }
    await Promise.all(writes);

    const now = new Date();
    const written = await updateQuizAttempt(
      this.prisma,
      soa.id,
      { submittedAt: now },
      { score: sumScores(scores), status: 'SUBMITTED', completedAt: now },
      { onlyUnsubmitted: true },
    );
    if (!written) {
      // Either a concurrent finalize won (return its result, it already bumped
      // and started Jev) or a teacher reset raced the submit.
      const current = await this.prisma.studentOnAssignment.findUnique({ where: { id: soa.id } });
      if (current?.quizAttempt?.submittedAt) return current;
      throw new ConflictException('QUIZ_NOT_STARTED');
    }
    const updated = await this.prisma.studentOnAssignment.findUniqueOrThrow({ where: { id: soa.id } });
    await this.cache.bump(
      subjectScope(soa.subjectId, 'submissions'),
      subjectScope(soa.subjectId, 'grades'),
    );
    if (settings.testMode) void this.integrity.evaluateWithJev(soa.id);
    return updated;
  }
}

/**
 * Mongo upsert is find-then-create: a concurrent finalize may create the same
 * missing-answer row first. That row is identical, so P2002 here is success.
 */
async function ignoreUniqueViolation(write: Promise<unknown>): Promise<unknown> {
  try {
    return await write;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
    throw error;
  }
}
