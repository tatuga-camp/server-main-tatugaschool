/**
 * Smoke test for the LINE-bot agent WITHOUT LINE: runs the same flow as
 * WebhooksService → AiService.answerSubjectQuestion against production data,
 * with you typing the question. Reports per-round timing, tool calls, token
 * usage vs the 1,048,576 window, total duration vs LINE's ~60s reply-token
 * deadline, and answer length vs LINE's 5000-char text cap.
 *
 * The DSL guards, preamble, and tool executor are the REAL compiled code
 * (imported from dist/), so what you exercise here is what production runs.
 * Only the Gemini call itself is mirrored over REST, because @google/genai
 * cannot load on Node >= 25 (SlowBuffer removed). Keep the loop below in sync
 * with AiService.answerSubjectQuestion if you change either.
 *
 * Read-only against the DB (read replica when DATABASE_URL_READ is set); the
 * Gemini generateContent calls bill normally. No LINE messages are sent.
 *
 * Usage (from servers/server-main-tatugaschool):
 *   npm run build                         # dist/ must be current
 *   node --env-file=.env.production scripts/smoke-line-agent.mjs 264734
 *   node --env-file=.env.production scripts/smoke-line-agent.mjs 264734 --question "สรุปคะแนนของ ..."
 * Interactive mode: type a question per line; empty line or Ctrl+C exits.
 */

import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import readline from 'node:readline/promises';
import { PrismaClient } from '@prisma/client';

const TOKEN_WINDOW = 1_048_576;
const LINE_TEXT_LIMIT = 5000;
const REPLY_TOKEN_DEADLINE_MS = 60_000;
const MAX_TOOL_ROUNDS = 4; // keep in sync with AiService.MAX_TOOL_ROUNDS

const distPath = [
  'dist/ai/subject-query-tool.js',
  'dist/src/ai/subject-query-tool.js',
].find(existsSync);
if (!distPath) {
  console.error('dist build not found — run `npm run build` first.');
  process.exit(1);
}
const { SubjectQueryToolService } = await import(pathToFileURL(distPath));

const apiKey = process.env.GOOGLE_AI_KEY;
if (!apiKey) {
  console.error('GOOGLE_AI_KEY is not set in the env file.');
  process.exit(1);
}

const args = process.argv.slice(2);
const qIndex = args.indexOf('--question');
const oneShotQuestion = qIndex >= 0 ? args[qIndex + 1] : undefined;
const mIndex = args.indexOf('--model');
// Default matches AiService.answerSubjectQuestion.
const MODEL = (mIndex >= 0 && args[mIndex + 1]) || 'gemini-3.1-flash-lite';
const idOrCode = args.filter(
  (a, i) => !a.startsWith('--') && i !== qIndex + 1 && i !== mIndex + 1,
)[0];
console.log(idOrCode);
if (!idOrCode) {
  console.error(
    'Usage: node --env-file=.env.production scripts/smoke-line-agent.mjs <subjectId|code> [--question "..."]',
  );
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL_READ ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
// Structural stand-in for PrismaReadService — same client surface.
const tool = new SubjectQueryToolService(prisma);

const subject = /^[0-9a-f]{24}$/i.test(idOrCode)
  ? await prisma.subject.findUnique({ where: { id: idOrCode } })
  : await prisma.subject.findUnique({ where: { code: idOrCode } });
if (!subject) {
  console.error(`Subject not found for "${idOrCode}"`);
  await prisma.$disconnect();
  process.exit(1);
}
console.log(
  `Subject: ${subject.title} (id=${subject.id}, code=${subject.code})` +
    (process.env.DATABASE_URL_READ ? '  [read replica]' : '  [primary DB]'),
);

const fmt = (n) => Number(n ?? 0).toLocaleString('en-US');

async function generateContent(body) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text.slice(0, 800));
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text);
}

function baseBody(contents, withTools) {
  return {
    contents,
    safetySettings: [
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_HARASSMENT',
    ].map((category) => ({ category, threshold: 'OFF' })),
    generationConfig: {
      maxOutputTokens: 65536,
      temperature: 1,
      topP: 0.95,
      thinkingConfig: { thinkingLevel: 'HIGH' },
    },
    ...(withTools
      ? {
          tools: [{ functionDeclarations: restDeclarations() }],
          toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        }
      : {}),
  };
}

function restDeclarations() {
  // The SDK's parametersJsonSchema field is called `parameters` on REST.
  return tool.functionDeclarations.map(({ parametersJsonSchema, ...rest }) => ({
    ...rest,
    parameters: parametersJsonSchema,
  }));
}

function partsOf(data) {
  return data.candidates?.[0]?.content?.parts ?? [];
}

// Mirror of the prompt in AiService.answerSubjectQuestion.
function buildPrompt(question, preamble) {
  return `You are an AI assistant helping a teacher via a LINE bot for the subject below.
The user asked or stated: "${question}"

Subject reference data (students, assignments, attendance sessions, score types, groups, rubrics — resolve names and numbers mentioned by the user to their ids using this):
${JSON.stringify(preamble)}

Your tasks:
1. Analyze the user's input and decide what data you need. When the user asks about a specific student (by name or number) or wants a student's summary, call get_student_summary with that student's studentOnSubjectId from the roster, then present a DETAILED report covering: ข้อมูลนักเรียน (student info), สรุปการเข้าเรียน (attendance summary), คะแนนพฤติกรรม (behavior scores — break down per title using behaviorScoreByTitle, e.g. for each title how many points and how many times, plus the total), สถานะการส่งงาน per assignment (submission status, use assignment titles from the reference data), คอมเม้นของคุณครู (teacher comments), and rubric scores if any. Whenever you report a student's score on an assignment that is rubric-graded (the assignment has a rubricId), ALSO include the rubric breakdown: each criterion (criterionTitle), the selected level (levelTitle), the points earned, and any comment — get_student_summary returns these resolved in rubricScores; otherwise query rubricScoreOnStudentAssignments with the studentOnAssignmentId and resolve titles from the rubrics reference data. For other questions use query_subject_data; prefer mode "groupBy" or "count" for totals and overviews.
2. Provide a helpful response that directly addresses the user's needs, in the same language the user asked in. Include every relevant detail you fetched; do not say data is missing unless a tool result actually came back empty.
3. Format your response so it is suitable for a LINE bot message (use emojis, bullet points, keep it friendly and easy to read on mobile screens).
4. Don't use **. Instead, use ALL CAPS for emphasis if needed. ** **`;
}

async function ask(question) {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  const preamble = await tool.getPreamble(subject.id);
  const preambleChars = JSON.stringify(preamble).length;
  console.log(`  preamble: ${fmt(preambleChars)} chars in ${elapsed()}ms`);

  const contents = [
    { role: 'user', parts: [{ text: buildPrompt(question, preamble) }] },
  ];

  let totalTokens = 0;
  let maxPromptTokens = 0;
  let answer = null;

  const trackUsage = (data) => {
    const u = data.usageMetadata ?? {};
    totalTokens += u.totalTokenCount ?? 0;
    maxPromptTokens = Math.max(maxPromptTokens, u.promptTokenCount ?? 0);
    return u;
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS && answer === null; round++) {
    const roundStart = Date.now();
    const data = await generateContent(baseBody(contents, true));
    const usage = trackUsage(data);

    const parts = partsOf(data);
    const calls = parts
      .filter((p) => p.functionCall)
      .map((p) => p.functionCall);
    const text = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');

    console.log(
      `  round ${round + 1}: ${Date.now() - roundStart}ms  prompt=${fmt(usage.promptTokenCount)}tok  output=${fmt(usage.candidatesTokenCount)}tok${usage.thoughtsTokenCount ? `  thoughts=${fmt(usage.thoughtsTokenCount)}tok` : ''}`,
    );

    if (calls.length === 0) {
      if (text) answer = text;
      break;
    }

    contents.push(data.candidates[0].content);
    const responseParts = [];
    for (const call of calls) {
      const toolStart = Date.now();
      const result = await tool.handleCall(
        subject.id,
        call.name,
        call.args ?? {},
      );
      const size = JSON.stringify(result).length;
      console.log(
        `    tool: ${call.name} ${JSON.stringify(call.args ?? {})}` +
          ` → ${result.error ? `ERROR: ${result.error}` : `${fmt(size)} chars`} in ${Date.now() - toolStart}ms`,
      );
      responseParts.push({
        functionResponse: { name: call.name, response: result },
      });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  if (answer === null) {
    const roundStart = Date.now();
    const data = await generateContent(baseBody(contents, false));
    const usage = trackUsage(data);
    answer = partsOf(data)
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');
    console.log(
      `  forced final: ${Date.now() - roundStart}ms  prompt=${fmt(usage.promptTokenCount)}tok  output=${fmt(usage.candidatesTokenCount)}tok`,
    );
  }

  const totalMs = elapsed();
  console.log('\n───────── ANSWER ─────────');
  console.log(
    answer || '(no answer text — production would send the apology fallback)',
  );
  console.log('──────────────────────────');
  console.log(
    `duration: ${(totalMs / 1000).toFixed(1)}s ${
      totalMs <= REPLY_TOKEN_DEADLINE_MS
        ? '→ within the ~60s LINE replyToken window'
        : '→ EXCEEDS ~60s: replyMessage would fail; replyOrPushMessage falls back to pushMessage (still delivered)'
    }`,
  );
  console.log(
    `tokens: max window usage ${fmt(maxPromptTokens)} / ${fmt(TOKEN_WINDOW)} (${((maxPromptTokens / TOKEN_WINDOW) * 100).toFixed(1)}%)  |  total billed across rounds: ${fmt(totalTokens)}`,
  );
  if (answer) {
    console.log(
      `answer length: ${fmt(answer.length)} chars ${
        answer.length <= LINE_TEXT_LIMIT
          ? '(fits LINE 5000 cap)'
          : `(over LINE 5000 cap — production truncates with …)`
      }`,
    );
  }
}

if (oneShotQuestion) {
  try {
    await ask(oneShotQuestion);
  } catch (error) {
    console.error(
      `FAILED after error [${error?.status ?? '-'}]: ${error?.message}` +
        '\n(production would send the apology fallback to the group)',
    );
    process.exitCode = 1;
  }
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log('Type a question (empty line to exit):');
  for (;;) {
    const question = (await rl.question('\nQ> ')).trim();
    if (!question) break;
    try {
      await ask(question);
    } catch (error) {
      console.error(
        `FAILED after error [${error?.status ?? '-'}]: ${error?.message}` +
          '\n(production would send the apology fallback to the group)',
      );
    }
  }
  rl.close();
}

await prisma.$disconnect();
