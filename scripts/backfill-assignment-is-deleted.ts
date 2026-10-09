// Prisma on MongoDB does not write @default values into existing documents,
// and `where: { isDeleted: false }` does not match a document without the
// field. Run once before deploying the soft-delete server. Idempotent.
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = (await prisma.$runCommandRaw({
      update: 'Assignment',
      updates: [
        {
          q: { isDeleted: { $exists: false } },
          u: { $set: { isDeleted: false } },
          multi: true,
        },
      ],
    })) as { ok?: number; n?: number; nModified?: number; writeErrors?: unknown[] };
    if (result.ok !== 1 || (result.writeErrors?.length ?? 0) > 0) {
      throw new Error(`Backfill failed: ${JSON.stringify(result)}`);
    }
    console.log(`OK: backfilled isDeleted=false on ${result.nModified ?? 0} assignments`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
