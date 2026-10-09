// scripts/verify-assignment-soft-delete.ts
// Run: dotenv -e .env.test -- bun run scripts/verify-assignment-soft-delete.ts
// Proves against a real DB that a document WITHOUT isDeleted is not matched by
// `isDeleted: false` until the backfill update runs, and that the flag flips.
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';

const prisma = new PrismaClient();

async function main() {
  const template = await prisma.assignment.findFirst();
  if (!template)
    throw new Error('Need at least one Assignment in the test DB to copy subjectId/schoolId from');

  const oid = '65f000000000000000000abc';
  const now = new Date().toISOString();
  let inserted = false;
  try {
    const insert = (await prisma.$runCommandRaw({
      insert: 'Assignment',
      documents: [
        {
          _id: { $oid: oid },
          createAt: { $date: now },
          updateAt: { $date: now },
          title: 'verify-assignment-soft-delete scratch',
          status: 'Draft',
          type: template.type,
          beginDate: { $date: now },
          vector: [],
          allowStudentViewScore: true,
          tags: [],
          subjectId: { $oid: template.subjectId },
          schoolId: { $oid: template.schoolId },
        },
      ],
    })) as { ok?: number; writeErrors?: unknown[] };
    assert.equal(insert.ok, 1);
    assert.equal(insert.writeErrors?.length ?? 0, 0);
    inserted = true;

    const live = () =>
      prisma.assignment.count({ where: { id: oid, isDeleted: false } });

    const beforeBackfill = await live();
    console.log(
      `INFO: missing field matched isDeleted:false = ${beforeBackfill === 1}`,
    );
    assert.equal(
      beforeBackfill,
      0,
      'a document without isDeleted must not match isDeleted:false (hence the backfill)',
    );

    // Same update the backfill script runs, restricted to this document.
    const backfill = (await prisma.$runCommandRaw({
      update: 'Assignment',
      updates: [
        {
          q: { _id: { $oid: oid }, isDeleted: { $exists: false } },
          u: { $set: { isDeleted: false } },
          multi: true,
        },
      ],
    })) as { ok?: number; writeErrors?: unknown[] };
    assert.equal(backfill.ok, 1);
    assert.equal(await live(), 1, 'after backfill the document must match');

    await prisma.assignment.update({
      where: { id: oid },
      data: { isDeleted: true },
    });
    assert.equal(await live(), 0, 'soft-deleted document must not match');

    console.log('OK: soft-delete filter behaves as required');
  } finally {
    if (inserted) {
      await prisma.$runCommandRaw({
        delete: 'Assignment',
        deletes: [{ q: { _id: { $oid: oid } }, limit: 1 }],
      });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
