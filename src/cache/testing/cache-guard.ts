const CACHED_MODELS = [
  'assignment',
  'fileOnAssignment',
  'questionOnVideo',
  'skillOnAssignment',
  'studentOnAssignment',
  'fileOnStudentAssignment',
  'commentOnAssignment',
  'attendanceTable',
  'attendanceRow',
  'attendance',
  'attendanceStatusList',
  'subject',
  'studentOnSubject',
  'teacherOnSubject',
  'scoreOnSubject',
  'scoreOnStudent',
  'gradeRange',
  'wordCloudSet',
  'wordCloud',
  'wordCloudAnswer',
  'memberOnSchool',
];
const COLLECTIONS = CACHED_MODELS.map((m) => m[0].toUpperCase() + m.slice(1));
const WRITE = 'create|createMany|update|updateMany|delete|deleteMany|upsert';

const TYPED = new RegExp(
  `\\b(?:this\\.prisma|prisma|tx)\\.(${CACHED_MODELS.join('|')})\\.(${WRITE})\\b`,
  'g',
);
// $runCommandRaw({ update: 'CommentOnAssignment', ... }) and friends.
const RAW = new RegExp(
  `\\b(?:update|delete|insert):\\s*'(${COLLECTIONS.join('|')})'`,
  'g',
);

export type GuardFile = { rel: string; source: string };

// Repositories may write cached models only if they bump; other files only via the allow-list.
export function findGuardOffenders(
  files: GuardFile[],
  allowed: Record<string, string>,
): string[] {
  const offenders: string[] = [];
  for (const { rel, source } of files) {
    const writes = [
      ...[...source.matchAll(TYPED)].map((m) => `${m[1]}.${m[2]}`),
      ...[...source.matchAll(RAW)].map((m) => `raw.${m[1]}`),
    ];
    if (writes.length === 0) continue;
    if (rel.endsWith('.repository.ts')) {
      if (!source.includes('this.cache.bump(')) {
        offenders.push(`${rel}: writes cached models without cache.bump`);
      }
      continue;
    }
    for (const write of writes) {
      const key = `${rel}:${write}`;
      if (!(key in allowed)) offenders.push(key);
    }
  }
  return offenders;
}

export function guardWriteKeys(files: GuardFile[]): Set<string> {
  const keys = new Set<string>();
  for (const { rel, source } of files) {
    for (const m of source.matchAll(TYPED)) keys.add(`${rel}:${m[1]}.${m[2]}`);
    for (const m of source.matchAll(RAW)) keys.add(`${rel}:raw.${m[1]}`);
  }
  return keys;
}
