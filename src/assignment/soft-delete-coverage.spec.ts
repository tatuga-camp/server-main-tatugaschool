// src/assignment/soft-delete-coverage.spec.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// Every direct Assignment read must hide soft-deleted rows, or say why not.
const READ =
  /\bassignment\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

describe('soft-delete coverage', () => {
  it('every prisma assignment read filters isDeleted or is marked includes-deleted', () => {
    const offenders: string[] = [];
    for (const file of files(join(__dirname, '..'))) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!READ.test(line)) return;
        const call = lines.slice(i, i + 15).join('\n');
        const marked =
          /includes-deleted:/.test(lines[i - 1] ?? '') ||
          /includes-deleted:/.test(line);
        if (!marked && !/isDeleted/.test(call))
          offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
