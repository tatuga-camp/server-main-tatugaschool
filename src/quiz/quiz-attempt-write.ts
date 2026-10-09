// src/quiz/quiz-attempt-write.ts
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { emptySummary } from '../quiz-integrity/integrity-summary';

/** Satisfies upsert's required `set` branch; never written because of the isSet guard. */
const NEVER_SET: Prisma.QuizAttemptCreateInput = {
  startedAt: new Date(0),
  lastSeenAt: new Date(0),
  shuffleSeed: 0,
  integritySummary: emptySummary(),
};

/**
 * Partially updates an existing quizAttempt (plus optional top-level fields)
 * in one atomic write. Returns false when the attempt no longer exists, e.g.
 * after a teacher reset, or (with `onlyUnsubmitted`) when the attempt has
 * already been submitted.
 */
export async function updateQuizAttempt(
  prisma: Pick<PrismaService, 'studentOnAssignment'>,
  studentOnAssignmentId: string,
  patch: Prisma.QuizAttemptUpdateInput,
  extra: Omit<Prisma.StudentOnAssignmentUpdateManyMutationInput, 'quizAttempt'> = {},
  opts: { onlyUnsubmitted?: boolean } = {},
): Promise<boolean> {
  const where: Prisma.StudentOnAssignmentWhereInput = opts.onlyUnsubmitted
    ? {
        id: studentOnAssignmentId,
        AND: [{ quizAttempt: { isSet: true } }, { quizAttempt: { is: { submittedAt: null } } }],
      }
    : { id: studentOnAssignmentId, quizAttempt: { isSet: true } };
  const { count } = await prisma.studentOnAssignment.updateMany({
    where,
    data: { ...extra, quizAttempt: { upsert: { set: NEVER_SET, update: patch } } },
  });
  return count > 0;
}
