# Service-Level Caching Implementation Plan — Part 3: cached reads

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the hot polls from Redis through explicit service-level cache units (spec §4), so that unchanged data costs no Atlas egress.

**Spec:** `docs/superpowers/specs/2026-10-02-service-level-caching-design.md` (§4, §6.1, §7)

**Read first:** part 1's **Global Constraints** and part 2's closing note. Tasks 1–8 must be complete, which means every cached-model write already bumps its scope. Rollout: Tasks 9–11 are step 2, Tasks 12–17 (step 3, step 4 and the final verification) are in `2026-10-02-service-level-caching-part4.md`.

## Rules for every task in this part

- **L1.** Loaders read with `this.prisma` (`PrismaService`, the primary), **never** through a repository that uses `prismaReadService`, and never `PrismaReadService` directly (spec §6 rule 2).
- **L2.** A loader returns `null` for "not found". The service turns `null` into the same exception the old code threw. A loader never throws `NotFoundException` itself, except the `ValidateAccess` loader, whose throws are deliberately not cached.
- **L3.** TTLs come only from `src/cache/cache-ttl.ts`.
- **L5.** A service that uses a reads/refs class constructs it once in its constructor, next to its repositories:
  - `this.refs = new CacheRefs(this.prisma, this.cache)`
  - `this.reads = new AssignmentReads(this.prisma, this.cache)`
  - `this.gradeReads = new GradeReads(this.prisma, this.cache)`
  - `this.subjectReads = new SubjectReads(this.prisma, this.cache)`
  - `this.attendanceReads = new AttendanceReads(this.prisma, this.cache)`

  Add `private cache: CacheService` to the service if it is missing, then apply part 1's R5 to its spec. In service specs, replace these fields with jest mocks after module creation (`service.reads = { subjectAssignments: jest.fn(), ... } as any`).
- **L4.** Cache unit tests use `createTestCache()` (real `CacheService` over `FakeRedis`) plus a jest-mocked `prisma`. The core assertions are: the second call hits the cache (the Prisma mock is called once), and a bump of the declared scope makes it reload.

## Review Focus

1. **A deleted record whose ref is still cached** must still return 404, not an empty list. Tests: Task 12 "deleted assignment → 404" and Task 15 "deleted submission → 404".
2. **A teacher removed from a subject** must be refused on their next request. Test: Task 9 "roster bump revokes access".
3. **A student not enrolled** gets `ForbiddenException`, even though `null` enrolment is cached. Test: Task 10.
4. **A revoked word-cloud results token** returns 404 after the bump. Test: Task 16.
5. **A changed subject code** makes the old code return 404 and the new code work. Test: Task 14.

---

### Task 9: Refs and the cached access check (rollout step 2)

**Files:**
- Create: `src/cache/cache-ttl.ts`, `src/cache/cache-refs.ts`, `src/cache/cache-refs.spec.ts`
- Modify: `src/teacher-on-subject/teacher-on-subject.service.ts:42-86` (`ValidateAccess`), `src/teacher-on-subject/teacher-on-subject.service.spec.ts`

**Interfaces:**
- Produces:
  - `TTL.REF = 86400`, `TTL.LONG = 3600`, `TTL.SHORT = 600`, `TTL.WORDCLOUD = 300`.
  - `CacheRefs` with these methods:
    - `assignment(id): Promise<{ subjectId: string; schoolId: string } | null>`
    - `subject(id): Promise<{ schoolId: string } | null>`
    - `attendanceTable(id): Promise<{ subjectId: string } | null>`
    - `submission(id): Promise<{ subjectId: string; studentId: string } | null>`
    - `wordCloudSet(id): Promise<{ subjectId: string } | null>`
    - `wordCloudToken(token): Promise<{ subjectId: string } | null>`
  - Constructed as `new CacheRefs(this.prisma, this.cache)`.

- [ ] **Step 1: Write the failing tests**

In `src/cache/cache-refs.spec.ts`:
- `assignment()` calls `prisma.assignment.findUnique` once across two calls, with `select: { subjectId: true, schoolId: true }`.
- A missing id returns `null` and is cached (still one Prisma call).

In `teacher-on-subject.service.spec.ts`, using a `createTestCache()` cache injected via `{ provide: CacheService, useValue: cache }` and mocked `prisma.subject.findUnique`, the member-on-school lookup and `teacherOnSubjectRepository.getByTeacherIdAndSubjectId`:

```ts
it('caches a successful access check', async () => {
  await service.ValidateAccess({ userId: 'u1', subjectId: 's1' });
  await service.ValidateAccess({ userId: 'u1', subjectId: 's1' });
  expect(service.teacherOnSubjectRepository.getByTeacherIdAndSubjectId).toHaveBeenCalledTimes(1);
});

it('roster bump revokes access', async () => {
  await service.ValidateAccess({ userId: 'u1', subjectId: 's1' });
  (service.teacherOnSubjectRepository.getByTeacherIdAndSubjectId as jest.Mock).mockResolvedValue(null);
  await cache.bump(subjectScope('s1', 'roster'));
  await expect(service.ValidateAccess({ userId: 'u1', subjectId: 's1' })).rejects.toThrow(ForbiddenException);
});

it('school-members bump re-evaluates membership', async () => {
  await service.ValidateAccess({ userId: 'u1', subjectId: 's1' });
  await cache.bump(schoolMembersScope('sch1'));
  await service.ValidateAccess({ userId: 'u1', subjectId: 's1' });
  expect(service.teacherOnSubjectRepository.getByTeacherIdAndSubjectId).toHaveBeenCalledTimes(2);
});

it('does not cache a refusal', async () => {
  (service.teacherOnSubjectRepository.getByTeacherIdAndSubjectId as jest.Mock).mockResolvedValueOnce(null);
  await expect(service.ValidateAccess({ userId: 'u1', subjectId: 's1' })).rejects.toThrow(ForbiddenException);
  await expect(service.ValidateAccess({ userId: 'u1', subjectId: 's1' })).resolves.toBeDefined();
});
```

The mocks return `{ schoolId: 'sch1' }` for the subject, `{ status: 'ACCEPT', role: 'TEACHER' }` for the member, and `{ id: 't1', status: 'ACCEPT' }` for the teacher.

- [ ] **Step 2: Run** `bun run jest src/cache/cache-refs.spec.ts src/teacher-on-subject`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/cache/cache-ttl.ts`:

```ts
export const TTL = { REF: 86_400, LONG: 3_600, SHORT: 600, WORDCLOUD: 300 } as const;
```

`src/cache/cache-refs.ts`:

```ts
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './cache.service';
import { TTL } from './cache-ttl';

// Immutable parent links (a record never moves subject or school), so no scopes.
export class CacheRefs {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  assignment(id: string) {
    return this.cache.getOrSet(`ref:assignment:${id}`, [], TTL.REF, () =>
      this.prisma.assignment.findUnique({ where: { id }, select: { subjectId: true, schoolId: true } }),
    );
  }
  subject(id: string) {
    return this.cache.getOrSet(`ref:subject:${id}`, [], TTL.REF, () =>
      this.prisma.subject.findUnique({ where: { id }, select: { schoolId: true } }),
    );
  }
  attendanceTable(id: string) {
    return this.cache.getOrSet(`ref:attendanceTable:${id}`, [], TTL.REF, () =>
      this.prisma.attendanceTable.findUnique({ where: { id }, select: { subjectId: true } }),
    );
  }
  submission(id: string) {
    return this.cache.getOrSet(`ref:submission:${id}`, [], TTL.REF, () =>
      this.prisma.studentOnAssignment.findUnique({ where: { id }, select: { subjectId: true, studentId: true } }),
    );
  }
  wordCloudSet(id: string) {
    return this.cache.getOrSet(`ref:wordCloudSet:${id}`, [], TTL.REF, () =>
      this.prisma.wordCloudSet.findUnique({ where: { id }, select: { subjectId: true } }),
    );
  }
  wordCloudToken(token: string) {
    return this.cache.getOrSet(`ref:wordCloudToken:${token}`, [], TTL.SHORT, () =>
      this.prisma.wordCloudSet.findFirst({ where: { publicResultsToken: token }, select: { subjectId: true } }),
    );
  }
}
```

Check the token field name against `WordCloudSetRepository.findSetByPublicResultsToken` and use the same field.

`ValidateAccess`: inject `private cache: CacheService` (already present after Task 5), create `this.refs = new CacheRefs(this.prisma, this.cache)` in the constructor, and restructure:

```ts
async ValidateAccess({ userId, subjectId }: { userId: string; subjectId: string }): Promise<TeacherOnSubject | 'admin-school'> {
  const subject = await this.refs.subject(subjectId);
  if (!subject) throw new NotFoundException('Subject Not Found');
  return this.cache.getOrSet(
    `access:${subjectId}:${userId}`,
    [subjectScope(subjectId, 'roster'), schoolMembersScope(subject.schoolId)],
    TTL.SHORT,
    () => this.loadAccess(userId, subjectId, subject.schoolId),
  );
}

private async loadAccess(userId: string, subjectId: string, schoolId: string): Promise<TeacherOnSubject | 'admin-school'> {
  // body of the old ValidateAccess from `findFirstMemberOnSchoolByUser` onward,
  // using `schoolId` instead of `subject.schoolId`, unchanged otherwise
}
```

Move the old lines 60–82 verbatim into `loadAccess`. That plan text names exact source lines, so it is not a placeholder.

- [ ] **Step 4: Run the tests again.** Expected: PASS. Then run `bun run jest` and `bun run build`.

- [ ] **Step 5: Commit** `git add src/cache src/teacher-on-subject && git commit -m "feat(cache): cache ValidateAccess and immutable refs"`

---

### Task 10: Assignment list from cache units #3, #4, #5 (rollout step 2)

**Files:**
- Create: `src/assignment/submission-counts.ts`, `src/assignment/submission-counts.spec.ts`, `src/assignment/assignment.reads.ts`, `src/assignment/assignment.reads.spec.ts`
- Modify: `src/assignment/assignment.service.ts` (`getAssignmentBySubjectId`, ~L144–276), `src/assignment/assignment.service.spec.ts` (the `getAssignmentBySubjectId` describe block)

**Interfaces:**
- Produces:
  - `toSubmissionCounts(groups): Record<string, SubmissionCounts>`
  - `EMPTY_COUNTS`
  - `AssignmentReads`, constructed as `new AssignmentReads(this.prisma, this.cache)`, with these methods:
    - `subjectAssignments(subjectId)` returns `{ assignments, files, questions }`
    - `submissionCounts(subjectId)` returns `Record<string, SubmissionCounts>`
    - `studentSubmissions(subjectId, studentOnSubjectId)` returns `StudentOnAssignment[]`
    - `enrollment(subjectId, studentId)` returns `StudentOnSubject | null`
  - Task 12 adds `assignmentSubmissions` to the same class.

- [ ] **Step 1: Write the failing parity test**

```ts
import { toSubmissionCounts } from './submission-counts';

const rows = [
  { assignmentId: 'a1', status: 'SUBMITTED', isAssigned: true },
  { assignmentId: 'a1', status: 'SUBMITTED', isAssigned: false },
  { assignmentId: 'a1', status: 'PENDDING', isAssigned: true },
  { assignmentId: 'a1', status: 'PENDDING', isAssigned: false },
  { assignmentId: 'a1', status: 'REVIEWD', isAssigned: true },
  { assignmentId: 'a2', status: 'PENDDING', isAssigned: true },
];

function legacy(assignmentId: string) {
  const s = rows.filter((r) => r.assignmentId === assignmentId);
  return {
    studentAssign: s.length,
    summitNumber: s.filter((r) => r.status === 'SUBMITTED').length,
    penddingNumber: s.filter((r) => r.status === 'PENDDING' && r.isAssigned === true).length,
    reviewNumber: s.filter((r) => r.status === 'REVIEWD').length,
  };
}

function groupBy() {
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = `${r.assignmentId}|${r.status}|${r.isAssigned}`;
    const g = map.get(k) ?? { ...r, _count: { _all: 0 } };
    g._count._all++;
    map.set(k, g);
  }
  return [...map.values()];
}

it('matches the legacy in-memory counts', () => {
  const counts = toSubmissionCounts(groupBy());
  expect(counts.a1).toEqual(legacy('a1'));
  expect(counts.a2).toEqual(legacy('a2'));
});
```

For `assignment.reads.spec.ts`, following L4, test each method with a jest-mocked prisma:
- `subjectAssignments` calls `assignment.findMany` once over two calls, with `omit: { vector: true, vectorResouce: true }`.
- It reloads after `bump(subjectScope('s1','assignments'))`.
- `submissionCounts` uses `studentOnAssignment.groupBy`, with `by: ['assignmentId','status','isAssigned']` and `where: { subjectId: 's1' }`, and reloads after a `submissions` bump.
- `enrollment` returns cached `null`.

- [ ] **Step 2: Run** `bun run jest src/assignment/submission-counts.spec.ts src/assignment/assignment.reads.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`src/assignment/submission-counts.ts`:

```ts
export type SubmissionCounts = { studentAssign: number; summitNumber: number; penddingNumber: number; reviewNumber: number };
export const EMPTY_COUNTS: SubmissionCounts = { studentAssign: 0, summitNumber: 0, penddingNumber: 0, reviewNumber: 0 };

type Group = { assignmentId: string; status: string; isAssigned: boolean; _count: { _all: number } };

export function toSubmissionCounts(groups: Group[]): Record<string, SubmissionCounts> {
  const out: Record<string, SubmissionCounts> = {};
  for (const g of groups) {
    const c = (out[g.assignmentId] ??= { ...EMPTY_COUNTS });
    const n = g._count._all;
    c.studentAssign += n;
    if (g.status === 'SUBMITTED') c.summitNumber += n;
    if (g.status === 'PENDDING' && g.isAssigned) c.penddingNumber += n;
    if (g.status === 'REVIEWD') c.reviewNumber += n;
  }
  return out;
}
```

`src/assignment/assignment.reads.ts`:

```ts
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';
import { toSubmissionCounts } from './submission-counts';

export class AssignmentReads {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  subjectAssignments(subjectId: string) {
    return this.cache.getOrSet(`subjectAssignments:${subjectId}`, [subjectScope(subjectId, 'assignments')], TTL.LONG, async () => {
      const assignments = await this.prisma.assignment.findMany({
        where: { subjectId },
        omit: { vector: true, vectorResouce: true },
      });
      const ids = assignments.map((a) => a.id);
      const videoIds = assignments.filter((a) => a.type === 'VideoQuiz').map((a) => a.id);
      const [files, questions] = await Promise.all([
        ids.length ? this.prisma.fileOnAssignment.findMany({ where: { assignmentId: { in: ids } } }) : [],
        videoIds.length ? this.prisma.questionOnVideo.findMany({ where: { assignmentId: { in: videoIds } } }) : [],
      ]);
      return { assignments, files, questions };
    });
  }

  submissionCounts(subjectId: string) {
    return this.cache.getOrSet(`submissionCounts:${subjectId}`, [subjectScope(subjectId, 'submissions')], TTL.LONG, async () =>
      toSubmissionCounts(
        (await this.prisma.studentOnAssignment.groupBy({
          by: ['assignmentId', 'status', 'isAssigned'],
          where: { subjectId },
          _count: { _all: true },
        })) as any,
      ),
    );
  }

  studentSubmissions(subjectId: string, studentOnSubjectId: string) {
    return this.cache.getOrSet(`studentSubmissions:${studentOnSubjectId}`, [subjectScope(subjectId, 'submissions')], TTL.LONG, () =>
      this.prisma.studentOnAssignment.findMany({ where: { subjectId, studentOnSubjectId } }),
    );
  }

  enrollment(subjectId: string, studentId: string) {
    return this.cache.getOrSet(`enrollment:${subjectId}:${studentId}`, [subjectScope(subjectId, 'roster')], TTL.LONG, () =>
      this.prisma.studentOnSubject.findFirst({ where: { subjectId, studentId } }),
    );
  }
}
```

In `AssignmentService`, add `private cache: CacheService` if missing, and set `this.reads = new AssignmentReads(this.prisma, this.cache)` in the constructor. Replace the body of `getAssignmentBySubjectId` (~L159–271) with:

```ts
if (user) {
  await this.teacherOnSubjectService.ValidateAccess({ userId: user.id, subjectId: dto.subjectId });
}
let mine: StudentOnAssignment[] = [];
if (student) {
  const enrollment = await this.reads.enrollment(dto.subjectId, student.id);
  if (!enrollment) throw new ForbiddenException('Student not enrolled in this subject');
  mine = (await this.reads.studentSubmissions(dto.subjectId, enrollment.id)).filter((s) => s.isAssigned);
  if (mine.length === 0) return [];
}
const [{ assignments, files, questions }, counts] = await Promise.all([
  this.reads.subjectAssignments(dto.subjectId),
  this.reads.submissionCounts(dto.subjectId),
]);
const visible = student
  ? assignments.filter((a) => a.status === 'Published' && mine.some((s) => s.assignmentId === a.id))
  : assignments;
return visible.map((assignment) => ({
  ...assignment,
  ...(counts[assignment.id] ?? EMPTY_COUNTS),
  questions: questions.filter((q) => q.assignmentId === assignment.id),
  files: files.filter((f) => f.assignmentId === assignment.id),
  studentOnAssignment: student ? mine.find((s) => s.assignmentId === assignment.id) : undefined,
}));
```

Update the old `getAssignmentBySubjectId` tests in `assignment.service.spec.ts` to mock `service.reads` (`subjectAssignments`, `submissionCounts`, `studentSubmissions`, `enrollment`) instead of the repositories. Keep their assertions on output shape and counts.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.

- [ ] **Step 5: Commit** `git add src/assignment && git commit -m "feat(cache): serve assignment lists from cache units with groupBy counts"`

---

### Task 11: Overviews (#10, plus a narrowed teacher read)

**Files:**
- Create: `src/grade/grade.reads.ts`, `src/grade/grade.reads.spec.ts`
- Modify: `src/assignment/assignment.service.ts` (`getOverviewScoreOnAssignment` ~L278–387 and `getOverviewScoreOnAssignments` ~L389+), `src/assignment/assignment.service.spec.ts`

**Interfaces:**
- Produces: `GradeReads`, constructed as `new GradeReads(this.prisma, this.cache)`. Its method `subjectGrades(subjectId)` returns `{ grade: GradeRange | null; scoreOnSubjects: ScoreOnSubject[] }`.

- [ ] **Step 1: Failing tests.**
  - `grade.reads.spec.ts` follows L4: one `gradeRange.findUnique` and one `scoreOnSubject.findMany` across two calls, then a reload after a `grades` bump.
  - In `assignment.service.spec.ts`:
    - The student overview with no enrolment rejects with `ForbiddenException`. Previously it crashed with a TypeError.
    - The teacher overview's `studentOnAssignment.findMany` is called with `select: { id: true, assignmentId: true, studentOnSubjectId: true, studentId: true, score: true, status: true, isAssigned: true }`, and with no `body`.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
export class GradeReads {
  constructor(private prisma: PrismaService, private cache: CacheService) {}
  subjectGrades(subjectId: string) {
    return this.cache.getOrSet(`subjectGrades:${subjectId}`, [subjectScope(subjectId, 'grades')], TTL.LONG, async () => {
      const [grade, scoreOnSubjects] = await Promise.all([
        this.prisma.gradeRange.findUnique({ where: { subjectId } }),
        this.prisma.scoreOnSubject.findMany({ where: { subjectId } }),
      ]);
      return { grade, scoreOnSubjects };
    });
  }
}
```

**Student overview.**
- Replace the subject read with `this.refs.subject(dto.subjectId)` (`NotFoundException` when null). Add `this.refs = new CacheRefs(...)`.
- Keep `studentRepository.findById` and the `student.id !== student_request.id` check.
- Replace `findFirst` with `this.reads.enrollment(...)`, throwing `ForbiddenException('Student not enrolled in this subject')` when null.
- Then build the result from:
  - `(await this.reads.subjectAssignments(id)).assignments.filter((a) => a.status === 'Published' && a.type === 'Assignment')`
  - `this.reads.studentSubmissions(id, enrollment.id)`
  - `this.gradeReads.subjectGrades(id)`
  - the uncached `scoreOnStudentRepository.findMany({ where: { studentOnSubjectId: enrollment.id } })`
- Keep the `JSON.parse(grade.gradeRules)` mapping and the return shape.

**Teacher overview.**
- `ValidateAccess`, then `subjectAssignments` filtered to `status === 'Published'` and `type` of `Assignment` or `VideoQuiz`.
- `this.prisma.studentOnAssignment.findMany({ where: { subjectId }, select: { id: true, assignmentId: true, studentOnSubjectId: true, studentId: true, score: true, status: true, isAssigned: true } })`.
- `subjectGrades`, and the existing `scoreOnStudent` read.
- Before narrowing, check the client-main overview page's use of `students[]` fields. Grep `client-main-tatugaschool` for the overview response type, and add any field it reads to the `select`.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.

- [ ] **Step 5: Commit** `git add src/grade src/assignment && git commit -m "feat(cache): overviews from cache units, no answer bodies"`

**Rollout step 2 complete.**

---

Next: `2026-10-02-service-level-caching-part4.md`, Task 12.
