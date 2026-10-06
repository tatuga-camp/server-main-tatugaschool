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

// SMOKE_DIST=dist-baseline compares against another build of the service.
const distDir = process.env.SMOKE_DIST ?? 'dist';
const findDist = (rel) =>
  [`${distDir}/${rel}`, `${distDir}/src/${rel}`].find(existsSync);
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
    `  round ${stats.round} (${request.config?.tools && request.config?.toolConfig?.functionCallingConfig?.mode !== 'NONE' ? 'tools' : 'forced final'}): ${Date.now() - start}ms  prompt=${fmt(usage.promptTokenCount)}tok  output=${fmt(usage.candidatesTokenCount)}tok${usage.thoughtsTokenCount ? `  thoughts=${fmt(usage.thoughtsTokenCount)}tok` : ''}`,
  );
  // Per-part shape: shows whether reasoning text arrives flagged as a
  // thought (SDK drops it) or as a plain text part (leaks into the answer).
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  parts.forEach((part, i) => {
    const kind = part.functionCall
      ? `functionCall ${part.functionCall.name}`
      : typeof part.text === 'string'
        ? `text${part.thought ? ' [THOUGHT]' : ''} ${fmt(part.text.length)}ch ${JSON.stringify(part.text.slice(0, 60))}`
        : Object.keys(part).join(',');
    console.log(
      `      part ${i}: ${kind}${part.thoughtSignature ? '  +signature' : ''}`,
    );
  });
  console.log(
    `      finishReason=${response.candidates?.[0]?.finishReason ?? '-'}` +
      (response.candidates?.[0]?.finishMessage
        ? `  finishMessage=${JSON.stringify(response.candidates[0].finishMessage)}`
        : ''),
  );
  if (
    EXPERIMENT &&
    !experimentDone &&
    request.config?.tools &&
    // first round answering a tool result — the intermittent failure point
    request.contents.at(-1)?.parts?.some((p) => p.functionResponse)
  ) {
    experimentDone = true;
    await runMalformedExperiment(request);
  }
  return response;
};

// ── --experiment: replay the first post-tool-result request with one change
// at a time, N tries each, and tally finish reasons — the failure is
// intermittent, so compare rates, not single outcomes. ──
const EXPERIMENT = args.includes('--experiment');
const EXPERIMENT_TRIES = 5;
let experimentDone = false;

async function runMalformedExperiment(request) {
  const contents = request.contents;
  const callTurn = contents[contents.length - 2];
  const responseTurn = contents[contents.length - 1];
  const call = callTurn?.parts?.find((p) => p.functionCall)?.functionCall;
  console.log('\n  ═══ EXPERIMENT: replaying the malformed round ═══');
  console.log(`    functionCall: ${JSON.stringify(call)}`);
  console.log(`    functionResponse: ${JSON.stringify(responseTurn?.parts?.[0]?.functionResponse)}`);

  const withLastResponse = (response) => [
    ...contents.slice(0, -1),
    {
      role: 'user',
      parts: [
        {
          functionResponse: {
            ...responseTurn.parts[0].functionResponse,
            response,
          },
        },
      ],
    },
  ];
  const original = responseTurn.parts[0].functionResponse.response;

  const variants = {
    'A same request (control)': request,
    'B tools kept + mode NONE': {
      ...request,
      config: {
        ...request.config,
        toolConfig: { functionCallingConfig: { mode: 'NONE' } },
      },
    },
    'C tools removed (current forced-final)': {
      ...request,
      config: { ...request.config, tools: undefined, toolConfig: undefined },
    },
    'D functionResponse carries call id': {
      ...request,
      contents: [
        ...contents.slice(0, -1),
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                ...responseTurn.parts[0].functionResponse,
                id: call?.id,
              },
            },
          ],
        },
      ],
    },
    'E non-empty result (rows:[] → note)': {
      ...request,
      contents: withLastResponse({
        ...original,
        rows: undefined,
        note: 'No records found for this query.',
      }),
    },
    'F thinking LOW': {
      ...request,
      config: {
        ...request.config,
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    },
  };

  for (const [label, variant] of Object.entries(variants)) {
    const tally = {};
    let sample = '';
    for (let i = 0; i < EXPERIMENT_TRIES; i++) {
      try {
        const r = await realGenerateContent(variant);
        const c = r.candidates?.[0];
        const kinds = (c?.content?.parts ?? [])
          .map((p) => (p.functionCall ? `call:${p.functionCall.name}` : p.thought ? 'thought' : 'text'))
          .join('+');
        const key = `${c?.finishReason ?? '-'}${kinds ? `(${kinds})` : ''}`;
        tally[key] = (tally[key] ?? 0) + 1;
        if (!sample && r.text) sample = r.text.slice(0, 80);
      } catch (error) {
        const key = `ERROR ${error?.status ?? ''} ${String(error?.message).slice(0, 80)}`;
        tally[key] = (tally[key] ?? 0) + 1;
      }
    }
    console.log(`    ${label.padEnd(40)} ${JSON.stringify(tally)}${sample ? `  e.g. ${JSON.stringify(sample)}` : ''}`);
  }
  console.log('  ═══ end experiment ═══\n');
}

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
