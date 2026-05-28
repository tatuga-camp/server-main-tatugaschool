/**
 * Normalize a tag array: trim, dedupe case-insensitively (first casing wins),
 * drop empty/non-string entries. Length/char caps are enforced by DTO decorators.
 */
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Map<string, string>(); // lowercase -> first-seen original
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()];
}
