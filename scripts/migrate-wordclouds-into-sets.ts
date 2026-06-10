/**
 * One-time migration: wrap every standalone WordCloud (wordCloudSetId == null)
 * into a WordCloudSet of one, so the new set-based UI is the single path.
 *
 * Run (test/dev):  bun run scripts/migrate-wordclouds-into-sets.ts
 * Idempotent: skips any WordCloud that already belongs to a set.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // NOTE: In MongoDB, WordClouds created before `wordCloudSetId` existed have
  // the field *missing*, not null. Prisma's `{ field: null }` filter matches
  // only explicit nulls, so we must also match unset fields via `isSet: false`.
  const orphans = await prisma.wordCloud.findMany({
    where: {
      wordCloudSetId: { isSet: false },
    },
  });
  console.log(`Found ${orphans.length} standalone word cloud(s) to migrate.`);

  let migrated = 0;
  for (const wc of orphans) {
    const set = await prisma.wordCloudSet.create({
      data: {
        subjectId: wc.subjectId,
        schoolId: wc.schoolId,
        userId: wc.userId,
        accessMode: wc.accessMode,
        allowMultiple: wc.allowMultiple,
        status: wc.status,
        activeWordCloudId: wc.id,
      },
    });
    await prisma.wordCloud.update({
      where: { id: wc.id },
      data: { wordCloudSetId: set.id, order: 0 },
    });
    migrated++;
  }

  console.log(`Migrated ${migrated} word cloud(s) into sets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
