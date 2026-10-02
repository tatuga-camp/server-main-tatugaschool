import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const CACHED_MODELS =
  'assignment|fileOnAssignment|questionOnVideo|skillOnAssignment|studentOnAssignment|fileOnStudentAssignment|commentOnAssignment|attendanceTable|attendanceRow|attendance|attendanceStatusList|subject|studentOnSubject|teacherOnSubject|scoreOnSubject|scoreOnStudent|gradeRange|wordCloudSet|wordCloud|wordCloudAnswer|memberOnSchool';
const WRITE = 'create|createMany|update|updateMany|delete|deleteMany|upsert';
const PATTERN = new RegExp(
  `\\b(?:this\\.prisma|prisma|tx)\\.(${CACHED_MODELS})\\.(${WRITE})\\b`,
  'g',
);

// file:model.op -> why the direct write is safe (it bumps explicitly).
const ALLOWED: Record<string, string> = {
  'attendance-status-list/attendance-status-list.service.ts:attendance.updateMany':
    'bumps attendance after the write',
  'rubric/rubric.service.ts:studentOnAssignment.update':
    'inside $transaction; bumps submissions after it resolves',
  'student-on-subject/student-on-subject.service.ts:studentOnSubject.update':
    'reorder; bumps roster after Promise.allSettled',
  'subject/subject.service.ts:assignment.update':
    'duplicate subject; bumps once at the end',
  'subject/subject.service.ts:questionOnVideo.create':
    'duplicate subject; bumps once at the end',
  'subject/subject.service.ts:teacherOnSubject.create':
    'createSubject; bumps roster after the write',
  'webhooks/webhooks.service.ts:subject.update':
    'LINE link; bumps roster after the write',
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('cache invalidation guard', () => {
  it('no direct write to a cached model outside repositories unless allow-listed', () => {
    const root = join(__dirname, '..');
    const offenders: string[] = [];
    for (const file of walk(root)) {
      if (
        !file.endsWith('.ts') ||
        file.endsWith('.spec.ts') ||
        file.endsWith('.repository.ts')
      )
        continue;
      const rel = relative(root, file).split('\\').join('/');
      for (const m of readFileSync(file, 'utf8').matchAll(PATTERN)) {
        const key = `${rel}:${m[1]}.${m[2]}`;
        if (!(key in ALLOWED)) offenders.push(key);
      }
    }
    expect(offenders).toEqual([]);
  });
});
