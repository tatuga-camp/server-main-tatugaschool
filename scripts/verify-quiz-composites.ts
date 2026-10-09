// scripts/verify-quiz-composites.ts
// One-off: proves the Prisma composite behaviours the quiz feature relies on.
// Run: bun run db:dev:up && bun run prisma:dev:deploy && dotenv -e .env.test -- bun run scripts/verify-quiz-composites.ts
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';

const prisma = new PrismaClient();

const summary = {
  exitCount: 0,
  totalAwayMs: 0,
  longestAwayMs: 0,
  blurCount: 0,
  translateDetected: false,
  pasteAttempts: 0,
  copyAttempts: 0,
  fullscreenExits: 0,
  screenshotKeyCount: 0,
  heartbeatGapCount: 0,
  longestHeartbeatGapMs: 0,
};

async function main() {
  const soa = await prisma.studentOnAssignment.findFirst();
  if (!soa)
    throw new Error('Need at least one StudentOnAssignment in the test DB');
  const original = soa.quizAttempt;
  try {
    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { quizAttempt: { unset: true } },
    });

    const first = await prisma.studentOnAssignment.updateMany({
      where: { id: soa.id, quizAttempt: { isSet: false } },
      data: {
        quizAttempt: {
          set: {
            startedAt: new Date(),
            lastSeenAt: new Date(),
            shuffleSeed: 7,
            integritySummary: summary,
          },
        },
      },
    });
    const second = await prisma.studentOnAssignment.updateMany({
      where: { id: soa.id, quizAttempt: { isSet: false } },
      data: {
        quizAttempt: {
          set: {
            startedAt: new Date(),
            lastSeenAt: new Date(),
            shuffleSeed: 99,
            integritySummary: summary,
          },
        },
      },
    });
    assert.equal(first.count, 1, 'first guarded set should update');
    assert.equal(second.count, 0, 'second guarded set must not update');

    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: {
        quizAttempt: {
          upsert: {
            set: {
              startedAt: new Date(),
              lastSeenAt: new Date(0),
              shuffleSeed: 99,
              integritySummary: summary,
            },
            update: {
              lastSeenAt: new Date(0),
              integritySummary: { set: { ...summary, exitCount: 3 } },
            },
          },
        },
      },
    });
    const after = await prisma.studentOnAssignment.findUniqueOrThrow({
      where: { id: soa.id },
    });
    assert.equal(
      after.quizAttempt?.shuffleSeed,
      7,
      'partial update kept shuffleSeed',
    );
    assert.equal(after.quizAttempt?.lastSeenAt.getTime(), 0);
    assert.equal(after.quizAttempt?.integritySummary.exitCount, 3);

    const setCount = await prisma.studentOnAssignment.count({
      where: { id: soa.id, quizAttempt: { isSet: true } },
    });
    assert.equal(setCount, 1);

    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { quizAttempt: { unset: true } },
    });
    const unsetCount = await prisma.studentOnAssignment.count({
      where: { id: soa.id, quizAttempt: { isSet: true } },
    });
    assert.equal(unsetCount, 0);
    console.log(
      'OK: composite update/isSet/unset/guarded-set all behave as required',
    );
  } finally {
    await prisma.studentOnAssignment.update({
      where: { id: soa.id },
      data: { quizAttempt: original ? { set: original } : { unset: true } },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
