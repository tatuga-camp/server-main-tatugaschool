/**
 * Measure how big a subject's AI payload really is — and get the REAL token
 * count from Google's tokenizer, to prove/refute the "subject data exceeds
 * Gemini's 1,048,576-token window" hypothesis behind the LINE-bot 400s.
 *
 * READ-ONLY: runs the same findMany/findUnique queries as
 * SubjectService.getAllSubjectData, plus Gemini `countTokens` (free, no
 * generation, nothing is stored). Nothing is written to the DB or LINE.
 *
 * Usage (from servers/server-main-tatugaschool):
 *   node --env-file=.env.production scripts/measure-subject-tokens.mjs <subjectId or 6-char code>
 *   node --env-file=.env.production scripts/measure-subject-tokens.mjs --scan
 *   node --env-file=.env.production scripts/measure-subject-tokens.mjs <id> --question "สรุปคะแนนให้หน่อย"
 *
 *   --scan        rank the top 15 subjects by record counts in the heaviest
 *                 collections, to find candidate subjects to measure
 *   --question    the user question to embed in the prompt (defaults below)
 *   --model       tokenizer model (default: gemini-3.1-flash-lite, same as AiService)
 *
 * Requires DATABASE_URL (Prisma) and GOOGLE_AI_KEY in the env file. If
 * GOOGLE_AI_KEY is missing, the script still reports sizes and a rough
 * estimate, just not the authoritative count.
 */

// NOTE: deliberately NOT importing @google/genai — its google-auth-library
// dependency chain (jws → jwa → buffer-equal-constant-time) crashes on
// Node >= 25 because SlowBuffer was removed. countTokens is called over
// plain REST with fetch instead; same tokenizer, same numbers.
import { PrismaClient } from '@prisma/client';

const TOKEN_LIMIT = 1_048_576; // Gemini flash input window
const TRUNCATION_CAP_CHARS = 500_000; // AiService.LINE_SUMMARY_DATA_LIMIT_CHARS

const args = process.argv.slice(2);
const getFlag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
};
const positional = args.filter(
  (a, i) => !a.startsWith('--') && args[i - 1] !== '--question' && args[i - 1] !== '--model',
);

const MODEL = getFlag('--model') ?? 'gemini-3.1-flash-lite';
const QUESTION =
  getFlag('--question') ?? 'สรุปภาพรวมคะแนนและการเข้าเรียนของนักเรียนให้หน่อย';

const prisma = new PrismaClient();

const fmt = (n) => n.toLocaleString('en-US');

async function scan() {
  console.log('Ranking subjects by record counts in the heaviest collections...\n');
  const heavy = [
    ['attendances', prisma.attendance],
    ['studentOnAssignments', prisma.studentOnAssignment],
    ['scoreOnStudents', prisma.scoreOnStudent],
    ['fileOnStudentAssignments', prisma.fileOnStudentAssignment],
  ];

  const totals = new Map(); // subjectId -> { total, per: {} }
  for (const [label, model] of heavy) {
    const rows = await model.groupBy({
      by: ['subjectId'],
      _count: { _all: true },
      orderBy: { _count: { subjectId: 'desc' } },
      take: 30,
    });
    for (const row of rows) {
      const entry = totals.get(row.subjectId) ?? { total: 0, per: {} };
      entry.per[label] = row._count._all;
      entry.total += row._count._all;
      totals.set(row.subjectId, entry);
    }
  }

  const top = [...totals.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 15);
  const subjects = await prisma.subject.findMany({
    where: { id: { in: top.map(([id]) => id) } },
    select: { id: true, title: true, code: true, lineGroupId: true },
  });
  const byId = new Map(subjects.map((s) => [s.id, s]));

  for (const [id, { total, per }] of top) {
    const s = byId.get(id);
    console.log(
      `${id}  code=${s?.code ?? '?'}  line=${s?.lineGroupId ? 'yes' : 'no'}  records=${fmt(total)}  ${JSON.stringify(per)}  "${s?.title ?? '(deleted?)'}"`,
    );
  }
  console.log(
    '\nPick a subjectId above and re-run:  node --env-file=.env.production scripts/measure-subject-tokens.mjs <subjectId>',
  );
}

async function measure(idOrCode) {
  const subject = /^[0-9a-f]{24}$/i.test(idOrCode)
    ? await prisma.subject.findUnique({ where: { id: idOrCode } })
    : await prisma.subject.findUnique({ where: { code: idOrCode } });

  if (!subject) {
    console.error(`Subject not found for "${idOrCode}" (tried ${/^[0-9a-f]{24}$/i.test(idOrCode) ? 'id' : 'code'})`);
    process.exitCode = 1;
    return;
  }
  console.log(`Subject: ${subject.title} (id=${subject.id}, code=${subject.code})\n`);

  // Mirror SubjectService.getAllSubjectData exactly (same queries, same order,
  // same wrapper keys). Descriptions are omitted from the wrapper here only in
  // name — their combined size (~3k chars) is added back as a constant below.
  const where = { where: { subjectId: subject.id } };
  const sections = {
    subject,
    attendanceTables: await prisma.attendanceTable.findMany(where),
    attendances: await prisma.attendance.findMany(where),
    scoreOnStudents: await prisma.scoreOnStudent.findMany(where),
    fileOnAssignments: await prisma.fileOnAssignment.findMany(where),
    studentOnAssignments: await prisma.studentOnAssignment.findMany(where),
    fileOnStudentAssignments: await prisma.fileOnStudentAssignment.findMany(where),
    commentOnAssignments: await prisma.commentOnAssignment.findMany(where),
    skillOnAssignments: await prisma.skillOnAssignment.findMany(where),
    skillOnStudentAssignments: await prisma.skillOnStudentAssignment.findMany(where),
    attendanceStatusLists: await prisma.attendanceStatusList.findMany(where),
    gradeRanges: await prisma.gradeRange.findMany(where),
    groupOnSubjects: await prisma.groupOnSubject.findMany(where),
    unitOnGroups: await prisma.unitOnGroup.findMany(where),
    studentOnGroups: await prisma.studentOnGroup.findMany(where),
    questionOnVideos: await prisma.questionOnVideo.findMany(where),
    studentOnSubjects: await prisma.studentOnSubject.findMany(where),
    assignments: await prisma.assignment.findMany({
      where: { subjectId: subject.id, status: 'Published' },
      omit: { vector: true },
    }),
    scoreOnSubjects: await prisma.scoreOnSubject.findMany(where),
    attendanceRows: await prisma.attendanceRow.findMany(where),
    teacherOnSubjects: await prisma.teacherOnSubject.findMany(where),
    rubrics: await prisma.rubric.findMany({
      where: { subjectId: subject.id },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
          include: { levels: { orderBy: { order: 'asc' } } },
        },
      },
    }),
    rubricScoreOnStudentAssignments: await prisma.rubricScoreOnStudentAssignment.findMany(where),
    announcements: await prisma.announcement.findMany({
      where: { subjectId: subject.id },
      orderBy: { createAt: 'desc' },
      take: 20,
    }),
    fileOnAnnouncements: await prisma.fileOnAnnouncement.findMany(where),
    commentOnAnnouncements: await prisma.commentOnAnnouncement.findMany(where),
  };

  // Per-section size report, largest first.
  const DESCRIPTIONS_OVERHEAD = 3200; // combined size of the description strings in getAllSubjectData
  const rows = Object.entries(sections).map(([key, data]) => ({
    key,
    records: Array.isArray(data) ? data.length : 1,
    chars: JSON.stringify({ description: '', data }).length,
  }));
  rows.sort((a, b) => b.chars - a.chars);

  console.log('Per-collection JSON size (largest first):');
  console.log('  records     chars      collection');
  for (const r of rows) {
    console.log(`  ${fmt(r.records).padStart(7)}  ${fmt(r.chars).padStart(11)}  ${r.key}`);
  }

  const serverData = JSON.stringify(
    Object.fromEntries(Object.entries(sections).map(([k, data]) => [k, { description: '', data }])),
  );
  const totalChars = serverData.length + DESCRIPTIONS_OVERHEAD;

  // The exact prompt generateLineBotSummary builds (pre-truncation).
  const prompt = `You are an AI assistant helping a user via a LINE bot.
The user asked or stated: "${QUESTION}"

Here is the relevant information from the server:
${serverData}

Your tasks:
1. Analyze the user's input and predict what the user needs or is trying to achieve.
2. Provide a concise, helpful response based on the server information that directly addresses the user's needs.
3. Format your response so it is suitable for a LINE bot message (use emojis, bullet points, keep it friendly and easy to read on mobile screens).
4. Don't use **. Instead, use ALL CAPS for emphasis if needed. ** **`;

  console.log(`\nTotal serialized subject data: ${fmt(totalChars)} chars (~${(totalChars / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Full prompt length:            ${fmt(prompt.length)} chars`);
  console.log(`Truncation cap (post-fix):     ${fmt(TRUNCATION_CAP_CHARS)} chars ${totalChars > TRUNCATION_CAP_CHARS ? '→ WOULD TRUNCATE' : '→ fits, no truncation'}`);

  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    console.log('\nGOOGLE_AI_KEY not set — skipping the authoritative countTokens call.');
    console.log(`Rough estimate at 3 chars/token: ~${fmt(Math.round(prompt.length / 3))} tokens (limit ${fmt(TOKEN_LIMIT)})`);
    return;
  }

  console.log(`\nCounting tokens with ${MODEL} (read-only, free)...`);
  const countChunk = async (text) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:countTokens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }] }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(body.slice(0, 500));
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  let totalTokens;
  let counted = 'exact';
  try {
    totalTokens = (await countChunk(prompt)).totalTokens;
  } catch (error) {
    // A request-size rejection (~20MB) on countTokens itself is already proof
    // the generate call could never work. Fall back to chunked counting for
    // the number anyway (chunk-boundary drift is negligible at this scale).
    console.log(`countTokens on the full prompt FAILED: [${error?.status}] ${error?.message}`);
    console.log('Falling back to chunked counting (sum of ~2MB chunks, small boundary drift)...');
    counted = 'chunked (approximate)';
    totalTokens = 0;
    const CHUNK = 2_000_000;
    for (let i = 0; i < prompt.length; i += CHUNK) {
      totalTokens += (await countChunk(prompt.slice(i, i + CHUNK))).totalTokens;
    }
  }

  const pct = ((totalTokens / TOKEN_LIMIT) * 100).toFixed(1);
  console.log(`\nRESULT (${counted}): ${fmt(totalTokens)} tokens = ${pct}% of the ${fmt(TOKEN_LIMIT)}-token window`);
  console.log(`Observed ratio: ${(prompt.length / totalTokens).toFixed(2)} chars/token`);
  if (totalTokens > TOKEN_LIMIT) {
    console.log('→ CONFIRMED: this subject alone exceeds the input window. Gemini returns 400 INVALID_ARGUMENT for it.');
  } else {
    console.log('→ This subject FITS in the window. If the failing subject is this one, the 400 came from something else — re-check the logs (they now include Gemini\'s message).');
  }
  console.log(
    `At the observed ratio, the 500k-char truncation cap ≈ ${fmt(Math.round(TRUNCATION_CAP_CHARS / (prompt.length / totalTokens)))} tokens.`,
  );
}

try {
  if (args.includes('--scan')) {
    await scan();
  } else if (positional[0]) {
    await measure(positional[0]);
  } else {
    console.error('Usage: node --env-file=.env.production scripts/measure-subject-tokens.mjs <subjectId|code> | --scan');
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
