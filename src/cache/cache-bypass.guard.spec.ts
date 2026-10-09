import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  findGuardOffenders,
  guardWriteKeys,
  GuardFile,
} from './testing/cache-guard';

// file:model.op -> why the direct write is safe (it bumps explicitly).
const ALLOWED: Record<string, string> = {
  'attendance-status-list/attendance-status-list.service.ts:attendance.updateMany':
    'bumps attendance after the write',
  'quiz/quiz.service.ts:assignment.create':
    'duplicate quiz; bumps assignments + submissions after the copy',
  'quiz/quiz.service.ts:assignment.update':
    'syncMaxScore; bumps assignments + grades after the write',
  'quiz/quiz.service.ts:studentOnAssignment.createMany':
    'duplicate quiz; bumps assignments + submissions after the copy',
  'quiz/quiz-attempt-write.ts:studentOnAssignment.updateMany':
    'quizAttempt partial writes (integrity/answers/finalize); integrity and answer writes must not bump, callers that change cached fields bump themselves',
  'quiz/student-quiz.service.ts:studentOnAssignment.updateMany':
    'start(): guarded quizAttempt set; bumps submissions + grades after the write when it matched',
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
  'subject/public-progress/public-progress.service.ts:subject.update':
    'share/updateLevel/revoke; each bumps roster after the write',
  'webhooks/webhooks.service.ts:subject.update':
    'LINE link; bumps roster after the write',
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function sourceFiles(): GuardFile[] {
  const root = join(__dirname, '..');
  return walk(root)
    .filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.endsWith('.spec.ts') &&
        !file.includes(`${join('cache', 'testing')}`),
    )
    .map((file) => ({
      rel: relative(root, file).split('\\').join('/'),
      source: readFileSync(file, 'utf8'),
    }));
}

describe('cache invalidation guard', () => {
  it('every write to a cached model bumps: repositories call cache.bump, other files are allow-listed', () => {
    expect(findGuardOffenders(sourceFiles(), ALLOWED)).toEqual([]);
  });

  it('every allow-list entry still matches a direct write (no stale entries)', () => {
    const seen = guardWriteKeys(sourceFiles());
    expect(Object.keys(ALLOWED).filter((key) => !seen.has(key))).toEqual([]);
  });
});
