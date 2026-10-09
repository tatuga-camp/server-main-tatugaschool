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
    // onlyUnsubmitted guard against a real DB.
    const unsubmitted = { startedAt: new Date(), lastSeenAt: new Date(), shuffleSeed: 7, submittedAt: null, integritySummary: emptySummary() };
    await prisma.studentOnAssignment.update({ where: { id: soa.id }, data: { quizAttempt: { set: unsubmitted } } });
    assert.equal(await updateQuizAttempt(prisma, soa.id, { lastSeenAt: new Date(1) }, {}, { onlyUnsubmitted: true }), true);
    const live = await prisma.studentOnAssignment.findUniqueOrThrow({ where: { id: soa.id } });
    assert.equal(live.quizAttempt?.lastSeenAt.getTime(), 1, 'submittedAt:null must match the guard');

    const submittedAt = new Date();
    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { quizAttempt: { set: { ...unsubmitted, submittedAt } } },
    });
    assert.equal(await updateQuizAttempt(prisma, soa.id, { lastSeenAt: new Date(2) }, { score: 99 }, { onlyUnsubmitted: true }), false);
    const frozen = await prisma.studentOnAssignment.findUniqueOrThrow({ where: { id: soa.id } });
    assert.equal(frozen.quizAttempt?.lastSeenAt.getTime(), unsubmitted.lastSeenAt.getTime(), 'submitted attempt must be unchanged');
    assert.notEqual(frozen.score, 99, 'extra fields must not be written for a submitted attempt');
    assert.equal(frozen.quizAttempt?.submittedAt?.getTime(), submittedAt.getTime());

    // Older shape: no submittedAt key at all. Record whether the guard matches it.
    const { submittedAt: _omit, ...legacy } = unsubmitted;
    await prisma.studentOnAssignment.update({ where: { id: soa.id }, data: { quizAttempt: { set: legacy } } });
    const legacyMatched = await updateQuizAttempt(prisma, soa.id, { lastSeenAt: new Date(3) }, {}, { onlyUnsubmitted: true });
    console.log(`INFO: onlyUnsubmitted on an attempt with NO submittedAt key matched: ${legacyMatched}`);

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
