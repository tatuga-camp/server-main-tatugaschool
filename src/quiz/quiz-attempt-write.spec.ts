// src/quiz/quiz-attempt-write.spec.ts
import { updateQuizAttempt } from './quiz-attempt-write';

describe('updateQuizAttempt', () => {
  it('guards on isSet, upserts the patch and reports whether a row matched', async () => {
    const prisma = { studentOnAssignment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } } as any;
    const at = new Date(5);
    await expect(updateQuizAttempt(prisma, 'soa1', { lastSeenAt: at }, { score: 2 })).resolves.toBe(true);
    const call = prisma.studentOnAssignment.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'soa1', quizAttempt: { isSet: true } });
    expect(call.data.score).toBe(2);
    expect(call.data.quizAttempt.upsert.update).toEqual({ lastSeenAt: at });
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateQuizAttempt(prisma, 'soa1', { lastSeenAt: at })).resolves.toBe(false);
  });

  it('with onlyUnsubmitted also requires submittedAt to be null', async () => {
    const prisma = { studentOnAssignment: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } } as any;
    await expect(
      updateQuizAttempt(prisma, 'soa1', { lastSeenAt: new Date(5) }, {}, { onlyUnsubmitted: true }),
    ).resolves.toBe(false);
    expect(prisma.studentOnAssignment.updateMany.mock.calls[0][0].where).toEqual({
      id: 'soa1',
      AND: [{ quizAttempt: { isSet: true } }, { quizAttempt: { is: { submittedAt: null } } }],
    });
  });
});
