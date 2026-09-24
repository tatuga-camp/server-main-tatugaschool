import { createHash } from 'crypto';

export type FingerprintInput = {
  errorName: string;
  message: string;
  stack: string;
};

const QUERY_STRING = /\?[^\s)]*/g;
const UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const OBJECT_ID = /\b[0-9a-f]{24}\b/gi;
const DIGITS = /\d+/g;
const LINE_COL = /:\d+(?::\d+)?\)?\s*$/;

/**
 * Lowercase, drop query strings, mask Mongo ids / uuids as <id> and every
 * remaining digit run as #, collapse whitespace.
 */
export function normalizeFragment(text: string): string {
  return text
    .toLowerCase()
    .replace(QUERY_STRING, '')
    .replace(UUID, '<id>')
    .replace(OBJECT_ID, '<id>')
    .replace(DIGITS, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * First "at ..." line of a stack (or the second line when none starts with
 * "at "), with the trailing :line:col stripped.
 */
export function firstStackFrame(stack: string): string {
  const lines = stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const frame = lines.find((line) => line.startsWith('at ')) ?? lines[1] ?? '';
  return frame.replace(LINE_COL, '');
}

export function computeFingerprint(input: FingerprintInput): string {
  const parts = [
    input.errorName.trim().toLowerCase(),
    normalizeFragment(input.message ?? ''),
    normalizeFragment(firstStackFrame(input.stack ?? '')),
  ];
  return createHash('sha1').update(parts.join('|')).digest('hex');
}
