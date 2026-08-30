/**
 * COLLSCAN proof for the LINE-bot query tool.
 *
 * Enumerates every query shape the query_subject_data DSL can emit — for each
 * collection: subjectId alone, subjectId + each whitelisted filter, subjectId +
 * date range, and every groupBy — and runs each through MongoDB `explain`
 * (queryPlanner verbosity: plans are chosen but NOTHING is executed).
 * FAILS loudly listing any shape whose winning plan contains a COLLSCAN stage.
 *
 * READ-ONLY. Run it yourself:
 *   npm run build   # the script reads COLLECTION_CONFIG from dist/ so it can never drift
 *   node --env-file=.env.production scripts/verify-query-indexes.mjs
 *
 * Requires DATABASE_URL (or DATABASE_URL_READ to test the read replica's indexes:
 *   node --env-file=.env.production scripts/verify-query-indexes.mjs --read-replica
 */

import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const distPath = ['dist/ai/subject-query-tool.js', 'dist/src/ai/subject-query-tool.js'].find(
  existsSync,
);
if (!distPath) {
  console.error('dist build not found — run `npm run build` first.');
  process.exit(1);
}
const { COLLECTION_CONFIG } = await import(pathToFileURL(distPath));

const useReadReplica = process.argv.includes('--read-replica');
if (useReadReplica && !process.env.DATABASE_URL_READ) {
  console.error('--read-replica given but DATABASE_URL_READ is not set.');
  process.exit(1);
}
const prisma = new PrismaClient(
  useReadReplica
    ? { datasources: { db: { url: process.env.DATABASE_URL_READ } } }
    : undefined,
);

// Values only steer plan selection, they don't need to match documents.
const DUMMY_OID = { $oid: 'ffffffffffffffffffffffff' };
const ejsonValue = (field) =>
  field.endsWith('Id') ? DUMMY_OID : 'DUMMY_STATUS';
const DATE_RANGE = {
  $gte: { $date: '2026-08-01T00:00:00.000Z' },
  $lte: { $date: '2026-08-31T00:00:00.000Z' },
};

function findCollscan(node, path = 'winningPlan') {
  if (!node || typeof node !== 'object') return null;
  if (node.stage === 'COLLSCAN') return path;
  for (const key of ['inputStage', 'innerStage', 'outerStage']) {
    const hit = findCollscan(node[key], `${path}.${key}`);
    if (hit) return hit;
  }
  for (const [i, child] of (node.inputStages ?? []).entries()) {
    const hit = findCollscan(child, `${path}.inputStages[${i}]`);
    if (hit) return hit;
  }
  return null;
}

function extractPlan(explain) {
  // find explain: queryPlanner at top level; aggregate explain: under stages/queryPlanner
  return (
    explain?.queryPlanner?.winningPlan ??
    explain?.stages?.[0]?.$cursor?.queryPlanner?.winningPlan ??
    explain?.queryPlanner ??
    null
  );
}

function indexName(plan) {
  let node = plan;
  while (node) {
    if (node.indexName) return node.indexName;
    node = node.inputStage;
  }
  return '(covered/other)';
}

async function explainFind(mongoCollection, filter) {
  return prisma.$runCommandRaw({
    explain: { find: mongoCollection, filter, limit: 200 },
    verbosity: 'queryPlanner',
  });
}

async function explainGroupBy(mongoCollection, filter, groupField) {
  return prisma.$runCommandRaw({
    explain: {
      aggregate: mongoCollection,
      pipeline: [
        { $match: filter },
        { $group: { _id: `$${groupField}`, count: { $sum: 1 } } },
      ],
      cursor: {},
    },
    verbosity: 'queryPlanner',
  });
}

const failures = [];
let checked = 0;

async function check(label, run) {
  checked++;
  try {
    const explain = await run();
    const plan = extractPlan(explain);
    if (!plan) {
      failures.push(`${label}: could not read winning plan from explain output`);
      console.log(`?  ${label}: no plan in explain output`);
      return;
    }
    const collscanAt = findCollscan(plan);
    if (collscanAt) {
      failures.push(`${label}: COLLSCAN at ${collscanAt}`);
      console.log(`✗  ${label}: COLLSCAN (${collscanAt})`);
    } else {
      console.log(`✓  ${label}: ${indexName(plan)}`);
    }
  } catch (error) {
    failures.push(`${label}: explain failed — ${error?.message?.slice(0, 200)}`);
    console.log(`?  ${label}: explain failed — ${error?.message?.slice(0, 120)}`);
  }
}

for (const [name, config] of Object.entries(COLLECTION_CONFIG)) {
  const base = { subjectId: DUMMY_OID };

  await check(`${name} [subjectId only]`, () =>
    explainFind(config.mongoCollection, base),
  );

  for (const field of config.filters) {
    await check(`${name} [subjectId + ${field}]`, () =>
      explainFind(config.mongoCollection, { ...base, [field]: ejsonValue(field) }),
    );
  }

  await check(`${name} [subjectId + ${config.dateField} range]`, () =>
    explainFind(config.mongoCollection, { ...base, [config.dateField]: DATE_RANGE }),
  );

  for (const groupField of config.groupBy) {
    await check(`${name} [groupBy ${groupField}]`, () =>
      explainGroupBy(config.mongoCollection, base, groupField),
    );
  }
}

// Shapes emitted by get_student_summary that the config loop does not cover:
// `in`-filters over the student's own studentOnAssignment ids.
for (const coll of ['CommentOnAssignment', 'RubricScoreOnStudentAssignment']) {
  await check(`student-summary [${coll} studentOnAssignmentId $in]`, () =>
    explainFind(coll, {
      subjectId: DUMMY_OID,
      studentOnAssignmentId: { $in: [DUMMY_OID, DUMMY_OID] },
    }),
  );
}
await check('student-summary [StudentOnSubject _id + subjectId]', () =>
  explainFind('StudentOnSubject', { _id: DUMMY_OID, subjectId: DUMMY_OID }),
);
await check('student-summary [Rubric subjectId] (title resolution + preamble)', () =>
  explainFind('Rubric', { subjectId: DUMMY_OID }),
);

console.log(`\nChecked ${checked} query shapes.`);
if (failures.length > 0) {
  console.error(`\nFAILED — ${failures.length} shape(s) are not index-backed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log('ALL SHAPES INDEX-BACKED — no COLLSCAN possible from the DSL.');
}

await prisma.$disconnect();
