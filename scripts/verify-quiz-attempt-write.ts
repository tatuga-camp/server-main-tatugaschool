// scripts/verify-quiz-attempt-write.ts
// Run: dotenv -e .env.test -- bun run scripts/verify-quiz-attempt-write.ts
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { emptySummary } from '../src/quiz-integrity/integrity-summary';
import { updateQuizAttempt } from '../src/quiz/quiz-attempt-write';

const prisma = new PrismaClient();

async function main() {
  const soa = await prisma.studentOnAssignment.findFirst();
  if (!soa) throw new Error('Need at least one StudentOnAssignment in the test DB');
  try {
    await prisma.studentOnAssignment.update({ where: { id: soa.id }, data: { quizAttempt: { unset: true } } });
    assert.equal(await updateQuizAttempt(prisma, soa.id, { lastSeenAt: new Date(0) }), false);
    const stillUnset = await prisma.studentOnAssignment.findUniqueOrThrow({ where: { id: soa.id } });
    assert.equal(stillUnset.quizAttempt, null, 'guarded write must not resurrect a reset attempt');

    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { quizAttempt: { set: { startedAt: new Date(), lastSeenAt: new Date(), shuffleSeed: 7, integritySummary: emptySummary() } } },
    });
    assert.equal(await updateQuizAttempt(prisma, soa.id, { lastSeenAt: new Date(0) }, { score: 1 }), true);
    const after = await prisma.studentOnAssignment.findUniqueOrThrow({ where: { id: soa.id } });
    assert.equal(after.quizAttempt?.shuffleSeed, 7);
    assert.equal(after.quizAttempt?.lastSeenAt.getTime(), 0);
    assert.equal(after.score, 1);
    console.log('OK: guarded attempt writes behave as required');
  } finally {
    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { score: soa.score, quizAttempt: soa.quizAttempt ? { set: soa.quizAttempt } : { unset: true } },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
