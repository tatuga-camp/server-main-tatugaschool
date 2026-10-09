import {
  AssignmentOnQuiz,
  QuizAttempt,
  QuizQuestionType,
  QuizSettings,
} from '@prisma/client';
import { hashString, seededShuffle } from './shuffle';

export type StudentQuizQuestion = {
  id: string;
  order: number;
  type: QuizQuestionType;
  prompt: string;
  imageUrl: string | null;
  points: number;
  options: { id: string; text: string; imageUrl: string | null }[];
  blanks: { id: string }[];
};

export type StudentQuizResultQuestion = StudentQuizQuestion & {
  correctOptionIds: string[];
  acceptedAnswers: { blankId: string; answers: string[] }[];
  score: number;
};

/** Builds the student shape field by field, so the answer key can never be spread in by accident. */
export function toStudentQuestion(q: AssignmentOnQuiz): StudentQuizQuestion {
  return {
    id: q.id,
    order: q.order,
    type: q.type,
    prompt: q.prompt,
    imageUrl: q.imageUrl ?? null,
    points: q.points,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      imageUrl: o.imageUrl ?? null,
    })),
    blanks: q.blanks.map((b) => ({ id: b.id })),
  };
}

export function orderForStudent(
  questions: AssignmentOnQuiz[],
  settings: QuizSettings,
  seed: number,
): StudentQuizQuestion[] {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const ordered = settings.shuffleQuestions
    ? seededShuffle(sorted, seed)
    : sorted;
  return ordered.map((q) => {
    const student = toStudentQuestion(q);
    if (settings.shuffleOptions) {
      student.options = seededShuffle(
        student.options,
        (seed ^ hashString(q.id)) >>> 0,
      );
    }
    return student;
  });
}

export function toStudentResultQuestion(
  q: AssignmentOnQuiz,
  score: number,
): StudentQuizResultQuestion {
  return {
    ...toStudentQuestion(q),
    correctOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
    acceptedAnswers: q.blanks.map((b) => ({
      blankId: b.id,
      answers: b.acceptedAnswers,
    })),
    score,
  };
}

export function isAnswered(answer: {
  selectedOptionIds: string[];
  blankAnswers: { value: string }[];
}): boolean {
  return (
    answer.selectedOptionIds.length > 0 ||
    answer.blankAnswers.some((b) => b.value.trim().length > 0)
  );
}

export type StudentSafeQuizAttempt = Pick<
  QuizAttempt,
  'startedAt' | 'deadlineAt' | 'submittedAt'
>;

export type StudentSafeSubmission<T> = Omit<T, 'quizAttempt'> & {
  quizAttempt: StudentSafeQuizAttempt | null;
};

/**
 * Reduces a StudentOnAssignment row for a student caller: the quiz attempt keeps only its
 * timestamps, so risk scores, integrity counters and the shuffle seed never leave the server.
 */
export function toStudentSafeSubmission<
  T extends { quizAttempt?: QuizAttempt | null },
>(soa: T): StudentSafeSubmission<T> {
  const { quizAttempt, ...rest } = soa;
  return {
    ...rest,
    quizAttempt: quizAttempt
      ? {
          startedAt: quizAttempt.startedAt,
          deadlineAt: quizAttempt.deadlineAt ?? null,
          submittedAt: quizAttempt.submittedAt ?? null,
        }
      : null,
  };
}
