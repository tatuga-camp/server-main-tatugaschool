import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Configuration ---
// This is the old GCS URL prefix (including the bucket name)
const OLD_PREFIX = 'https://storage.googleapis.com/server-tatugaschool/';

// This is the new custom domain URL for R2
const NEW_PREFIX = 'https://storage.tatugaschool.com/';

// NEW: Define a chunk size for transactions
const CHUNK_SIZE = 150;
// ---------------------

/**
 * A helper function to find and replace URLs for a specific model and field.
 * @param modelDelegate - The Prisma model delegate (e.g., prisma.user)
 * @param modelName - The string name of the model (for logging)
 * @param fieldName - The string name of the field to update (e.g., 'photo')
 */
async function processUpdates(
  modelDelegate: any,
  modelName: string,
  fieldName: string,
) {
  console.log(`\n--- Checking ${modelName}.${fieldName} ---`);

  // 1. Find all documents that need updating
  const itemsToUpdate = await modelDelegate.findMany({
    where: {
      [fieldName]: {
        startsWith: OLD_PREFIX,
      },
    },
    // We need the ID and the field itself to compute the new value
    select: {
      id: true,
      [fieldName]: true,
    },
  });

  if (itemsToUpdate.length === 0) {
    console.log(`No items to update for ${modelName}.${fieldName}.`);
    return;
  }

  console.log(
    `Found ${itemsToUpdate.length} items for ${modelName}.${fieldName}. Preparing chunked transactions...`,
  );

  let updatePromises = [];
  let processedCount = 0;
  let chunkNumber = 1;

  // 2. Prepare all update operations, but run them in chunks
  for (const item of itemsToUpdate) {
    const oldUrl = item[fieldName];

    // Check for null/string and that it really starts with the prefix
    if (typeof oldUrl === 'string' && oldUrl.startsWith(OLD_PREFIX)) {
      // Extract the object key (the part after the prefix)
      const objectKey = oldUrl.substring(OLD_PREFIX.length);
      // Create the new URL
      const newUrl = NEW_PREFIX + objectKey;

      // Add the update operation to our promise array
      updatePromises.push(
        modelDelegate.update({
          where: { id: item.id },
          data: { [fieldName]: newUrl },
          select: { id: true }, // Select minimally for performance
        }),
      );
    }

    // 3. Run the transaction when the chunk is full or we're at the end
    if (
      updatePromises.length === CHUNK_SIZE ||
      item.id === itemsToUpdate[itemsToUpdate.length - 1].id
    ) {
      if (updatePromises.length > 0) {
        console.log(
          `Running transaction for ${modelName}.${fieldName} - chunk ${chunkNumber} (${updatePromises.length} items)...`,
        );
        try {
          await Promise.all(updatePromises);
          console.log(
            `Successfully updated chunk ${chunkNumber} for ${modelName}.${fieldName}.`,
          );
          processedCount += updatePromises.length;
        } catch (error) {
          console.error(
            `Failed to update chunk ${chunkNumber} for ${modelName}.${fieldName}:`,
            error,
          );
          // Don't stop the whole script, just log the error for this chunk
        }
        // Clear the array for the next chunk
        updatePromises = [];
        chunkNumber++;
      }
    }
  }

  console.log(
    `Finished processing for ${modelName}.${fieldName}. Total items updated: ${processedCount} / ${itemsToUpdate.length}.`,
  );
}

const main = async () => {
  try {
    console.log('Starting URL migration script...');
    console.log(`Replacing old prefix: ${OLD_PREFIX}`);
    console.log(`With new prefix: ${NEW_PREFIX}`);

    // --- Run updates for all relevant models and fields ---

    await processUpdates(prisma.user, 'User', 'photo');
    await processUpdates(prisma.school, 'School', 'logo');
    await processUpdates(prisma.memberOnSchool, 'MemberOnSchool', 'photo');
    await processUpdates(prisma.student, 'Student', 'photo');
    await processUpdates(prisma.subject, 'Subject', 'backgroundImage');
    await processUpdates(prisma.subject, 'Subject', 'wheelOfNamePath');
    await processUpdates(prisma.teacherOnSubject, 'TeacherOnSubject', 'photo');
    await processUpdates(prisma.studentOnSubject, 'StudentOnSubject', 'photo');
    await processUpdates(prisma.unitOnGroup, 'UnitOnGroup', 'icon');
    await processUpdates(prisma.studentOnGroup, 'StudentOnGroup', 'photo');
    await processUpdates(prisma.fileOnAssignment, 'FileOnAssignment', 'url');
    await processUpdates(
      prisma.studentOnAssignment,
      'StudentOnAssignment',
      'photo',
    );
    await processUpdates(
      prisma.fileOnStudentAssignment,
      'FileOnStudentAssignment',
      'body',
    );
    await processUpdates(
      prisma.commentOnAssignment,
      'CommentOnAssignment',
      'photo',
    );
    await processUpdates(
      prisma.teachingMaterial,
      'TeachingMaterial',
      'thumbnail',
    );
    await processUpdates(
      prisma.teachingMaterial,
      'TeachingMaterial',
      'creatorURL',
    );
    await processUpdates(
      prisma.teachingMaterial,
      'TeachingMaterial',
      'canvaURL',
    );
    await processUpdates(
      prisma.fileOnTeachingMaterial,
      'FileOnTeachingMaterial',
      'url',
    );

    console.log('\nMigration script finished successfully.');
  } catch (error) {
    console.error('An error occurred during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
};

main();
