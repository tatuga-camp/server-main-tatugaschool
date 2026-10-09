// src/quiz/student-quiz.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Assignment, QuizSettings, StudentOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { StudentJwtPayload } from '../interfaces/jwt-payload';
import { emptySummary } from '../quiz-integrity/integrity-summary';
import { validateAnswerShape } from './grading';
import { QuizAccess } from './quiz-access';
import { updateQuizAttempt } from './quiz-attempt-write';
import { QuizAttemptService } from './quiz-attempt.service';
import { computeDeadline, isPastGrace, withDefaultQuizSettings } from './quiz-settings';
import { newShuffleSeed } from './shuffle';
import {
  orderForStudent,
  StudentQuizQuestion,
  StudentQuizResultQuestion,
  toStudentResultQuestion,
} from './student-question.mapper';
import { SaveQuizAnswerDto } from './dto';

export type StudentQuizView = {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    maxScore: number | null;
    allowStudentViewScore: boolean;
    quizSettings: QuizSettings;
  };
  serverNow: string;
  questionCount: number;
  attempt: { startedAt: Date; deadlineAt: Date | null; submittedAt: Date | null } | null;
  questions: StudentQuizQuestion[];
  answers: {
    questionId: string;
    selectedOptionIds: string[];
    blankAnswers: { blankId: string; value: string }[];
  }[];
  result: {
    score: number;
    maxScore: number;
    questions: StudentQuizResultQuestion[] | null;
  } | null;
};

@Injectable()
export class StudentQuizService {
  constructor(
    private prisma: PrismaService,
    private access: QuizAccess,
    private attempts: QuizAttemptService,
    private cache: CacheService,
  ) {}

  async getQuiz(studentOnAssignmentId: string, student: StudentJwtPayload): Promise<StudentQuizView> {
    const { soa, assignment } = await this.access.studentQuiz(studentOnAssignmentId, student);
    const now = new Date();
    const attempt = soa.quizAttempt;
    const current =
      attempt && !attempt.submittedAt && isPastGrace(attempt.deadlineAt, now)
        ? await this.attempts.finalizeAttempt(soa.id)
        : soa;
    return this.buildView(current, assignment, now);
  }

  async start(studentOnAssignmentId: string, student: StudentJwtPayload): Promise<StudentQuizView> {
    const { soa, assignment } = await this.access.studentQuiz(studentOnAssignmentId, student);
    if (!soa.quizAttempt) {
      const questionCount = await this.prisma.assignmentOnQuiz.count({
        where: { assignmentId: assignment.id },
      });
      if (questionCount === 0) throw new BadRequestException('QUIZ_EMPTY');

      const now = new Date();
      const settings = withDefaultQuizSettings(assignment.quizSettings);
      // A due date already in the past does not close a late start (existing late-work behaviour).
      const dueDate =
        assignment.dueDate && assignment.dueDate.getTime() > now.getTime() ? assignment.dueDate : null;
      const started = await this.prisma.studentOnAssignment.updateMany({
        where: { id: soa.id, quizAttempt: { isSet: false } },
        data: {
          quizAttempt: {
            set: {
              startedAt: now,
              deadlineAt: computeDeadline(now, settings.timeLimitMinutes, dueDate),
              submittedAt: null,
              lastSeenAt: now,
              shuffleSeed: newShuffleSeed(),
              integritySummary: emptySummary(),
              riskScore: 0,
              riskSource: 'RULE',
              riskPattern: null,
              riskConfidence: null,
              riskCheckedAt: null,
              riskInputHash: null,
            },
          },
        },
      });
      if (started.count > 0) {
        await this.cache.bump(subjectScope(soa.subjectId, 'submissions'));
      }
    }
    return this.getQuiz(studentOnAssignmentId, student);
  }

  async saveAnswer(
    studentOnAssignmentId: string,
    questionId: string,
    dto: SaveQuizAnswerDto,
    student: StudentJwtPayload,
  ): Promise<{ questionId: string; savedAt: Date }> {
    const { soa } = await this.access.studentQuiz(studentOnAssignmentId, student);
    const attempt = soa.quizAttempt;
    if (!attempt) throw new ConflictException('QUIZ_NOT_STARTED');
    if (attempt.submittedAt) throw new ConflictException('QUIZ_CLOSED');
    const now = new Date();
    if (isPastGrace(attempt.deadlineAt, now)) {
      await this.attempts.finalizeAttempt(soa.id);
      throw new ConflictException('QUIZ_CLOSED');
    }

    const question = await this.prisma.assignmentOnQuiz.findUnique({ where: { id: questionId } });
    if (!question || question.assignmentId !== soa.assignmentId) {
      throw new NotFoundException('Question not found');
    }
    const shapeError = validateAnswerShape(question, dto);
    if (shapeError) throw new BadRequestException(shapeError);

    // Guarded write first: if a teacher reset the attempt since the access
    // check, refuse instead of writing an answer into a dead attempt.
    if (!(await updateQuizAttempt(this.prisma, soa.id, { lastSeenAt: now }))) {
      throw new ConflictException('QUIZ_NOT_STARTED');
    }

    const answer = await this.prisma.studentOnQuiz.upsert({
      where: {
        studentOnAssignmentId_assignmentOnQuizId: {
          studentOnAssignmentId: soa.id,
          assignmentOnQuizId: question.id,
        },
      },
      create: {
        selectedOptionIds: dto.selectedOptionIds,
        blankAnswers: dto.blankAnswers,
        assignmentOnQuizId: question.id,
        studentOnAssignmentId: soa.id,
        assignmentId: soa.assignmentId,
        studentId: soa.studentId,
        subjectId: soa.subjectId,
        schoolId: soa.schoolId,
      },
      update: {
        selectedOptionIds: dto.selectedOptionIds,
        blankAnswers: { set: dto.blankAnswers },
      },
    });
    return { questionId: question.id, savedAt: answer.updateAt };
  }

  async submit(studentOnAssignmentId: string, student: StudentJwtPayload): Promise<StudentQuizView> {
    const { soa, assignment } = await this.access.studentQuiz(studentOnAssignmentId, student);
    if (!soa.quizAttempt) throw new ConflictException('QUIZ_NOT_STARTED');
    const finalized = await this.attempts.finalizeAttempt(soa.id);
    return this.buildView(finalized, assignment, new Date());
  }

  private async buildView(
    soa: StudentOnAssignment,
    assignment: Assignment,
    now: Date,
  ): Promise<StudentQuizView> {
    const settings = withDefaultQuizSettings(assignment.quizSettings);
    const attempt = soa.quizAttempt;
    const [questions, answers] = await Promise.all([
      this.prisma.assignmentOnQuiz.findMany({
        where: { assignmentId: assignment.id },
        orderBy: { order: 'asc' },
      }),
      attempt
        ? this.prisma.studentOnQuiz.findMany({ where: { studentOnAssignmentId: soa.id } })
        : Promise.resolve([]),
    ]);
    const submitted = !!attempt?.submittedAt;
    const scoreByQuestion = new Map(answers.map((a) => [a.assignmentOnQuizId, a.score ?? 0]));

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        maxScore: assignment.maxScore,
        allowStudentViewScore: assignment.allowStudentViewScore,
        quizSettings: settings,
      },
      serverNow: now.toISOString(),
      questionCount: questions.length,
      attempt: attempt
        ? { startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, submittedAt: attempt.submittedAt }
        : null,
      questions: attempt && !submitted ? orderForStudent(questions, settings, attempt.shuffleSeed) : [],
      answers: answers.map((a) => ({
        questionId: a.assignmentOnQuizId,
        selectedOptionIds: a.selectedOptionIds,
        blankAnswers: a.blankAnswers,
      })),
      result: submitted
        ? {
            score: soa.score ?? 0,
            maxScore: assignment.maxScore ?? 0,
            questions: settings.showAnswersAfterSubmit
              ? questions.map((q) => toStudentResultQuestion(q, scoreByQuestion.get(q.id) ?? 0))
              : null,
          }
        : null,
    };
  }
}
