/**
 * Smoke test for the LINE-bot agent WITHOUT LINE: runs the REAL compiled
 * AiService.answerSubjectQuestion (imported from dist/) against production
 * data, with you typing the question. Prompt, tool loop, model choice, and
 * DSL guards are all the production code — change ai.service.ts, run
 * `npm run build`, and this script exercises the change with no mirror to
 * keep in sync.
 *
 * Reports per-round timing, tool calls, token usage vs the 1,048,576 window,
 * total duration vs LINE's ~60s reply-token deadline, and answer length vs
 * LINE's 5000-char text cap.
 *
 * Node >= 25 removed SlowBuffer, which @google/genai's dependency chain
 * (jwa → buffer-equal-constant-time) still dereferences at import time; the
 * polyfill below restores it BEFORE dist/ is imported. It only affects the
 * unused service-account auth path — API-key auth never touches it.
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
import { createRequire } from 'node:module';
import readline from 'node:readline/promises';
import { PrismaClient } from '@prisma/client';

// SlowBuffer polyfill — MUST run before dist/ (and thus @google/genai) loads.
const bufferModule = createRequire(import.meta.url)('buffer');
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const TOKEN_WINDOW = 1_048_576;
const LINE_TEXT_LIMIT = 5000;
const REPLY_TOKEN_DEADLINE_MS = 60_000;

const findDist = (rel) =>
  [`dist/${rel}`, `dist/src/${rel}`].find(existsSync);
const toolPath = findDist('ai/subject-query-tool.js');
const aiPath = findDist('ai/ai.service.js');
if (!toolPath || !aiPath) {
  console.error('dist build not found — run `npm run build` first.');
  process.exit(1);
}
const { SubjectQueryToolService } = await import(pathToFileURL(toolPath));
const { AiService } = await import(pathToFileURL(aiPath));

const apiKey = process.env.GOOGLE_AI_KEY;
if (!apiKey) {
  console.error('GOOGLE_AI_KEY is not set in the env file.');
  process.exit(1);
}

const args = process.argv.slice(2);
const qIndex = args.indexOf('--question');
const oneShotQuestion = qIndex >= 0 ? args[qIndex + 1] : undefined;
const idOrCode = args.filter(
  (a, i) => !a.startsWith('--') && i !== qIndex + 1,
)[0];
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
// ConfigService/HttpService stand-ins: answerSubjectQuestion only reads
// GOOGLE_AI_KEY via config.get; httpService is never touched on this path.
const ai = new AiService({ get: (key) => process.env[key] }, null, tool);

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

// ── Diagnostics: wrap the real collaborators instead of mirroring the loop ──
const stats = { round: 0, totalTokens: 0, maxPromptTokens: 0 };
const resetStats = () => {
  stats.round = 0;
  stats.totalTokens = 0;
  stats.maxPromptTokens = 0;
};

const realGetPreamble = tool.getPreamble.bind(tool);
tool.getPreamble = async (subjectId) => {
  const start = Date.now();
  const preamble = await realGetPreamble(subjectId);
  console.log(
    `  preamble: ${fmt(JSON.stringify(preamble).length)} chars in ${Date.now() - start}ms`,
  );
  return preamble;
};

const realHandleCall = tool.handleCall.bind(tool);
tool.handleCall = async (subjectId, name, callArgs) => {
  const start = Date.now();
  const result = await realHandleCall(subjectId, name, callArgs);
  const size = JSON.stringify(result).length;
  console.log(
    `    tool: ${name} ${JSON.stringify(callArgs ?? {})}` +
      ` → ${result.error ? `ERROR: ${result.error}` : `${fmt(size)} chars`} in ${Date.now() - start}ms`,
  );
  return result;
};

// `googleAI` is TS-private but a plain property at runtime.
const models = ai.googleAI.models;
const realGenerateContent = models.generateContent.bind(models);
models.generateContent = async (request) => {
  const start = Date.now();
  const response = await realGenerateContent(request);
  const usage = response.usageMetadata ?? {};
  stats.round += 1;
  stats.totalTokens += usage.totalTokenCount ?? 0;
  stats.maxPromptTokens = Math.max(
    stats.maxPromptTokens,
    usage.promptTokenCount ?? 0,
  );
  console.log(
    `  round ${stats.round} (${request.config?.tools ? 'tools' : 'forced final'}): ${Date.now() - start}ms  prompt=${fmt(usage.promptTokenCount)}tok  output=${fmt(usage.candidatesTokenCount)}tok${usage.thoughtsTokenCount ? `  thoughts=${fmt(usage.thoughtsTokenCount)}tok` : ''}`,
  );
  return response;
};

async function ask(question) {
  resetStats();
  const startedAt = Date.now();

  // THE production entrypoint — same call WebhooksService makes.
  const answer = await ai.answerSubjectQuestion({
    subjectId: subject.id,
    question,
  });

  const totalMs = Date.now() - startedAt;
  console.log('\n───────── ANSWER ─────────');
  console.log(answer);
  console.log('──────────────────────────');
  console.log(
    `duration: ${(totalMs / 1000).toFixed(1)}s ${
      totalMs <= REPLY_TOKEN_DEADLINE_MS
        ? '→ within the ~60s LINE replyToken window'
        : '→ EXCEEDS ~60s: replyMessage would fail; replyOrPushMessage falls back to pushMessage (still delivered)'
    }`,
  );
  console.log(
    `tokens: max window usage ${fmt(stats.maxPromptTokens)} / ${fmt(TOKEN_WINDOW)} (${((stats.maxPromptTokens / TOKEN_WINDOW) * 100).toFixed(1)}%)  |  total billed across rounds: ${fmt(stats.totalTokens)}`,
  );
  console.log(
    `answer length: ${fmt(answer.length)} chars ${
      answer.length <= LINE_TEXT_LIMIT
        ? '(fits LINE 5000 cap)'
        : `(over LINE 5000 cap — production truncates with …)`
    }`,
  );
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
