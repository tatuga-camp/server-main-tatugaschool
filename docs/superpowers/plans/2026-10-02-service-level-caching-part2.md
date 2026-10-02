# Service-Level Caching Implementation Plan — Part 2: remaining repositories, bypass writes, guard test

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish rollout step 1. Every write to a cached model bumps its scope, and a guard test fails the build if a new write skips the repositories.

**Spec:** `docs/superpowers/specs/2026-10-02-service-level-caching-design.md`

**Read first:** `2026-10-02-service-level-caching-part1.md`, in particular its **Global Constraints**, **Repository migration procedure R1–R6** and **Review Focus**. Those apply to every task here. Tasks 1–2 must be complete. They provide `CacheService`, `subjectScope`, `schoolMembersScope`, `ALL_SUBJECT_SCOPE_KINDS`, `createPassthroughCache` and `createPrismaStub`.

Each task's bump test follows the same pattern as `src/cache/bumps/assignments.bumps.spec.ts` from Task 2. A table of `{ name, run, scopes }` cases is asserted with `expect(cache.bump).toHaveBeenCalledWith(scope)`. Adjust each `run` call's arguments to the method's real signature; never change `scopes`. The shared fixture is:

```ts
const record = { id: 'r1', subjectId: 's1', schoolId: 'sch1', assignmentId: 'a1', attendanceTableId: 't1', studentOnAssignmentId: 'soa1', title: 'x', contentType: 'TEXT', body: '' };
const storage = { DeleteFileOnStorage: jest.fn() } as any;
```

The `describe` body is:

```ts
it.each(cases)('$name', async ({ run, scopes }) => {
  const cache = createPassthroughCache();
  await run(cache, createPrismaStub(record));
  for (const scope of scopes) expect(cache.bump).toHaveBeenCalledWith(scope);
});
```

---

### Task 3: Submissions scope (StudentOnAssignment, FileOnStudentAssignment, CommentAssignment)

**Files:**
- Create: `src/cache/bumps/submissions.bumps.spec.ts`
- Modify: `src/student-on-assignment/student-on-assignment.repository.ts`, `src/file-on-student-assignment/file-on-student-assignment.repository.ts`, `src/comment-assignment/comment-assignment.repository.ts`, `src/file-on-student-assignment/file-on-student-assignment.repository.spec.ts` (line ~20: add `createPassthroughCache()` as the last constructor argument), and the construction sites below

**Interfaces:**
- Produces:
  - `StudentOnAssignmentRepository.updateMany(request, subjectId: string)`, which gains a required second argument.
  - `StudentOnAssignmentRepository.deleteByAssignmentId(request: { assignmentId: string; subjectId: string })`.

- [ ] **Step 1: Write the failing test**

`src/cache/bumps/submissions.bumps.spec.ts` uses these cases, with `const S = subjectScope('s1', 'submissions')`:

```ts
const cases = [
  { name: 'SoA.create', run: (c, p) => new StudentOnAssignmentRepository(p, c).create({ data: {} as any }), scopes: [S] },
  { name: 'SoA.createMany', run: (c, p) => new StudentOnAssignmentRepository(p, c).createMany({ data: [{ subjectId: 's1' } as any] }), scopes: [S] },
  { name: 'SoA.update', run: (c, p) => new StudentOnAssignmentRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [S] },
  { name: 'SoA.updateMany', run: (c, p) => new StudentOnAssignmentRepository(p, c).updateMany({ where: { assignmentId: 'a1' }, data: {} }, 's1'), scopes: [S] },
  { name: 'SoA.delete', run: (c, p) => new StudentOnAssignmentRepository(p, c).delete({ studentOnAssignmentId: 'r1' }), scopes: [S] },
  { name: 'SoA.deleteByAssignmentId', run: (c, p) => new StudentOnAssignmentRepository(p, c).deleteByAssignmentId({ assignmentId: 'a1', subjectId: 's1' }), scopes: [S] },
  { name: 'FileOnSA.create', run: (c, p) => new FileOnStudentAssignmentRepository(p, storage, c).create({ data: {} as any }), scopes: [S] },
  { name: 'FileOnSA.update', run: (c, p) => new FileOnStudentAssignmentRepository(p, storage, c).update({ where: { id: 'r1' }, data: {} }), scopes: [S] },
  { name: 'FileOnSA.delete', run: (c, p) => new FileOnStudentAssignmentRepository(p, storage, c).delete({ fileOnStudentAssignmentId: 'r1' }), scopes: [S] },
  { name: 'FileOnSA.deleteMany', run: (c, p) => new FileOnStudentAssignmentRepository(p, storage, c).deleteMany({ where: { assignmentId: 'a1' } }), scopes: [S] },
  { name: 'Comment.create', run: (c, p) => new CommentAssignmentRepository(p, c).create({ data: {} as any }), scopes: [S] },
  { name: 'Comment.update', run: (c, p) => new CommentAssignmentRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [S] },
  { name: 'Comment.delete', run: (c, p) => new CommentAssignmentRepository(p, c).delete({ commentOnAssignmentId: 'r1' }), scopes: [S] },
];
```

Add one more case: `FileOnSA.deleteMany` when `findMany` returns `[]` bumps nothing. Build that case's `prisma` with `fileOnStudentAssignment: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) }`.

- [ ] **Step 2: Run** `bun run jest src/cache/bumps/submissions.bumps.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Migrate (R1–R3)**

| Repository / method | Bump |
|---|---|
| `StudentOnAssignmentRepository.create` L179, `.update` L241 | `subjectScope(result.subjectId, 'submissions')` |
| `.createMany` L210 | `const first = Array.isArray(request.data) ? request.data[0] : request.data; if (first?.subjectId) bump(subjectScope(first.subjectId, 'submissions'))` |
| `.updateMany` L267 | New signature `updateMany(request, subjectId: string)`. Bump `subjectScope(subjectId, 'submissions')`. |
| `.delete` L293 | Capture `const deleted = await this.prisma.studentOnAssignment.delete(...)` and bump `subjectScope(deleted.subjectId, 'submissions')`. |
| `.deleteByAssignmentId` L325 | The request gains `subjectId`. Bump `subjectScope(request.subjectId, 'submissions')`. |
| `FileOnStudentAssignmentRepository.create` L124, `.update` L50 | `subjectScope(result.subjectId, 'submissions')` |
| `.delete` L144 | The pre-delete `findUnique` record's `subjectId` |
| `.deleteMany` L201 | The pre-read rows: if any, bump `subjectScope(rows[0].subjectId, 'submissions')` |
| `CommentAssignmentRepository.create` L93, `.update` L116, `.delete` L143 | `subjectScope(result.subjectId, 'submissions')` |

Delete the dead `Array.isArray(result)` cache blocks in StudentOnAssignmentRepository (~L186–343) as part of R2.

- [ ] **Step 4: Construction sites (R4) and specs (R5)**

- **`new StudentOnAssignmentRepository(`**: assignment.repository.ts:61, assignment.service.ts:92, class.service.ts:69, comment-assignment.service.ts:37, file-on-student-assignment.service.ts:45, skill-on-student-assignment.service.ts:61, student-on-assignment.service.ts:73, student-on-subject.repository.ts:63 (replace `redisService` with `cache`), student-on-subject.service.ts:88, subject.service.ts:126.
- **`new FileOnStudentAssignmentRepository(`**: assignment.repository.ts:69, file-on-student-assignment.service.ts:49, student-on-assignment.service.ts:85, subject.service.ts:130.
- **`new CommentAssignmentRepository(`**: comment-assignment.service.ts:34, subject.service.ts:132.
- Callers of `updateMany` / `deleteByAssignmentId` now pass `subjectId`. `AssignmentRepository.delete` already has `ref.subjectId` from Task 2. `bun run build` lists the rest.

- [ ] **Step 5: Verify.** `bun run jest` and `bun run build`. Expected: all pass, exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/cache src/student-on-assignment src/file-on-student-assignment src/comment-assignment src/assignment src/class src/skill-on-student-assignment src/student-on-subject src/subject
git commit -m "feat(cache): submissions-scope repositories bump on write"
```

---

### Task 4: Attendance scope (AttendanceTable, AttendanceRow, Attendance, AttendanceStatusListS)

**Files:**
- Create: `src/cache/bumps/attendance.bumps.spec.ts`
- Modify: `src/attendance-table/attendance-table.repository.ts`, `src/attendance-row/attendance-row.repository.ts`, `src/attendance/attendance.repository.ts`, `src/attendance-status-list/attendance-status-list.repository.ts` (class `AttendanceStatusListSRepository`, with the trailing S), and the construction sites

**Interfaces:**
- Produces: `AttendanceStatusListSRepository.deleteMany(request, subjectId: string)`, which gains a required second argument.

- [ ] **Step 1: Write the failing test** with `const T = subjectScope('s1', 'attendance')`:

```ts
const cases = [
  { name: 'Table.create', run: (c, p) => new AttendanceTableRepository(p, p, c).createAttendanceTable({ data: {} as any }), scopes: [T] },
  { name: 'Table.update', run: (c, p) => new AttendanceTableRepository(p, p, c).updateAttendanceTable({ where: { id: 't1' }, data: {} }), scopes: [T] },
  { name: 'Table.delete', run: (c, p) => new AttendanceTableRepository(p, p, c).deleteAttendanceTable({ attendanceTableId: 't1' }), scopes: [T] },
  { name: 'Row.create', run: (c, p) => new AttendanceRowRepository(p, c).createAttendanceRow({ data: {} as any }), scopes: [T] },
  { name: 'Row.update', run: (c, p) => new AttendanceRowRepository(p, c).updateAttendanceRow({ where: { id: 'r1' }, data: {} }), scopes: [T] },
  { name: 'Row.delete', run: (c, p) => new AttendanceRowRepository(p, c).deleteAttendanceRow({ attendanceRowId: 'r1' }), scopes: [T] },
  { name: 'Attendance.create', run: (c, p) => new AttendanceRepository(p, p, c).create({ data: {} as any }), scopes: [T] },
  { name: 'Attendance.updateById', run: (c, p) => new AttendanceRepository(p, p, c).updateAttendanceById({ query: { attendanceId: 'r1' }, body: {} } as any), scopes: [T] },
  { name: 'Status.create', run: (c, p) => new AttendanceStatusListSRepository(p, c).create({ data: {} as any }), scopes: [T] },
  { name: 'Status.update', run: (c, p) => new AttendanceStatusListSRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [T] },
  { name: 'Status.delete', run: (c, p) => new AttendanceStatusListSRepository(p, c).delete({ where: { id: 'r1' } }), scopes: [T] },
  { name: 'Status.deleteMany', run: (c, p) => new AttendanceStatusListSRepository(p, c).deleteMany({ where: { attendanceTableId: 't1' } }, 's1'), scopes: [T] },
];
```

The `(p, p, c)` order follows the current `(prisma, prismaReadService)` parameters, plus the new `cache` last.

- [ ] **Step 2: Run** `bun run jest src/cache/bumps/attendance.bumps.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Migrate (R1–R3).** Every single-record write bumps `subjectScope(result.subjectId, 'attendance')`:
  - `AttendanceTableRepository.createAttendanceTable` L99, `updateAttendanceTable` L123, and `deleteAttendanceTable` L150, where `result` is the `remove` record at ~L172 and also covers its nested deletes.
  - `AttendanceRowRepository.createAttendanceRow` L111 (`row`, which also covers the nested `attendance.createMany`), `updateAttendanceRow` L161, `deleteAttendanceRow` L191.
  - `AttendanceRepository.create` L39, `updateAttendanceById` L111.
  - `AttendanceStatusListSRepository.create` L87, `update` L108, `delete` L131.
  - `AttendanceStatusListSRepository.deleteMany` L168 takes a new `subjectId: string` argument and bumps that.
  - Keep `prismaReadService` for reads in AttendanceTable and Attendance.

- [ ] **Step 4: Construction sites (R4) and specs (R5)**

- **`new AttendanceTableRepository(`** (replace `redisService` with `cache`): attendance-row.service.ts:59, attendance-status-list.service.ts:37, attendance-table.service.ts:58.
- **`new AttendanceRowRepository(`**: attendance.service.ts:57, attendance-row.service.ts:53, attendance-table.service.ts:57, student-on-subject.service.ts:114.
- **`new AttendanceRepository(`** (replace `redisService`): attendance.service.ts:49, attendance-row.service.ts:54, attendance-table.service.ts:63, student-on-subject.service.ts:109.
- **`new AttendanceStatusListSRepository(`**: attendance.service.ts, attendance-status-list.service.ts, attendance-table.service.ts:68. Run `grep -rn "new AttendanceStatusListSRepository(" src` to get the exact lines.
- If a service no longer uses `redisService` after this change, remove that constructor parameter, and remove its provider from that service's spec.

- [ ] **Step 5: Verify.** `bun run jest` and `bun run build`.

- [ ] **Step 6: Commit**

```bash
git add src/cache src/attendance src/attendance-row src/attendance-table src/attendance-status-list src/student-on-subject
git commit -m "feat(cache): attendance-scope repositories bump on write"
```

---

### Task 5: Roster scope and school members (Subject, StudentOnSubject, TeacherOnSubject, MemberOnSchool)

**Files:**
- Create: `src/cache/bumps/roster.bumps.spec.ts`
- Modify: `src/subject/subject.repository.ts`, `src/student-on-subject/student-on-subject.repository.ts`, `src/teacher-on-subject/teacher-on-subject.repository.ts`, `src/member-on-school/member-on-school.repository.ts`, and the construction sites

**Interfaces:**
- Produces: `SubjectRepository.updateMany(request, subjectIds: string[])`, which gains a required second argument.

- [ ] **Step 1: Write the failing test.** Use `const R = subjectScope('s1', 'roster')`. Because the stub returns the same record for every model, the fixture record uses `id: 's1'`, so the Subject cases see `result.id === 's1'`.

```ts
const all = ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('s1', k));
const cases = [
  { name: 'Subject.createSubject', run: (c, p) => new SubjectRepository(p, storage, p, c).createSubject({ data: {} as any }), scopes: [R] },
  { name: 'Subject.update', run: (c, p) => new SubjectRepository(p, storage, p, c).update({ where: { id: 's1' }, data: {} }), scopes: [R] },
  { name: 'Subject.updateMany', run: (c, p) => new SubjectRepository(p, storage, p, c).updateMany({ where: { id: { in: ['s1'] } }, data: {} }, ['s1']), scopes: [R] },
  { name: 'Subject.deleteSubject', run: (c, p) => new SubjectRepository(p, storage, p, c).deleteSubject({ subjectId: 's1' }), scopes: all },
  { name: 'SoS.create', run: (c, p) => new StudentOnSubjectRepository(p, storage, c, p).createStudentOnSubject({ data: {} as any }), scopes: [R] },
  { name: 'SoS.createMany', run: (c, p) => new StudentOnSubjectRepository(p, storage, c, p).createMany({ data: [{ subjectId: 's1' } as any] }), scopes: [R] },
  { name: 'SoS.update', run: (c, p) => new StudentOnSubjectRepository(p, storage, c, p).update({ where: { id: 'r1' }, data: {} }), scopes: [R] },
  { name: 'SoS.delete', run: (c, p) => new StudentOnSubjectRepository(p, storage, c, p).delete({ studentOnSubjectId: 'r1' }), scopes: [R, subjectScope('s1', 'attendance'), subjectScope('s1', 'grades'), subjectScope('s1', 'submissions')] },
  { name: 'ToS.create', run: (c, p) => new TeacherOnSubjectRepository(p, c).create({ data: {} as any }), scopes: [R] },
  { name: 'ToS.update', run: (c, p) => new TeacherOnSubjectRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [R] },
  { name: 'ToS.delete', run: (c, p) => new TeacherOnSubjectRepository(p, c).delete({ teacherOnSubjectId: 'r1' }), scopes: [R] },
  { name: 'MoS.create', run: (c, p) => new MemberOnSchoolRepository(p, c).create({ data: {} as any }), scopes: [schoolMembersScope('sch1')] },
  { name: 'MoS.update', run: (c, p) => new MemberOnSchoolRepository(p, c).updateMemberOnSchool({ query: { memberOnSchoolId: 'r1' }, body: {} } as any), scopes: [schoolMembersScope('sch1')] },
  { name: 'MoS.delete', run: (c, p) => new MemberOnSchoolRepository(p, c).delete({ memberOnSchoolId: 'r1' }), scopes: [schoolMembersScope('sch1'), R] },
];
```

Set the shared `record.id` to `'s1'` for this file only.

- [ ] **Step 2: Run** `bun run jest src/cache/bumps/roster.bumps.spec.ts`. Expected: FAIL.

- [ ] **Step 3: Migrate (R1–R3)**

| Method | Bump |
|---|---|
| `SubjectRepository.createSubject` L149, `.update` L167 | `subjectScope(result.id, 'roster')` |
| `.reorderSubjects` L181 | Each updated subject: `subjectScope(updated.id, 'roster')`. Collect the scopes and call `bump(...scopes)` once. |
| `.updateMany` L97 | New argument `subjectIds: string[]`. Bump roster for each. |
| `.deleteSubject` L235 | After the final delete, call `bump(...ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope(subject.id, k)))`. |
| `StudentOnSubjectRepository.createStudentOnSubject` L178, `.updateStudentOnSubject` L225, `.update` L251 | `subjectScope(result.subjectId, 'roster')` |
| `.createMany` L201 | First item's `subjectId`, as in Task 3. Bump nothing if `data` is empty. |
| `.delete` L272 | `result` at L372: bump roster, attendance, grades and submissions for `result.subjectId` |
| `TeacherOnSubjectRepository.create` L177, `.update` L206, `.delete` L234 | `subjectScope(result.subjectId, 'roster')` |
| `MemberOnSchoolRepository.create` L132, `.updateMemberOnSchool` L170 | `schoolMembersScope(result.schoolId)` |
| `.delete` L193 | Before the nested `teacherOnSubject.deleteMany` (L202), run `const affected = await this.prisma.teacherOnSubject.findMany({ where: <the same where as the deleteMany>, select: { subjectId: true } })`. After the deletes, bump `schoolMembersScope(result.schoolId)` plus `subjectScope(a.subjectId, 'roster')` for each affected row. |

`StudentOnSubjectRepository` keeps `prismaReadService` for reads. Its parameter order becomes `(prisma, storageService, cache, prismaReadService)`, with `cache` in the slot `redisService` used to occupy. That is deliberate: it keeps every call site a one-word change.

- [ ] **Step 4: Construction sites (R4) and specs (R5)**

- **`new SubjectRepository(`** (add `cache` last): attendance.service.ts:64, class.repository.ts:41 (thread `cache` into `ClassRepository`), score-on-subject.service.ts:35, student-on-subject.service.ts:91, subject.service.ts:121.
- **`new StudentOnSubjectRepository(`** (replace `this.redisService` with `this.cache`): assignment.service.ts:86, attendance.service.ts:58, attendance-table.service.ts:51, score-on-student.service.ts:36, skill-on-student-assignment.service.ts:69, student.repository.ts:41, student-on-assignment.service.ts:67, student-on-subject.service.ts:81, subject.service.ts:109.
- **`new TeacherOnSubjectRepository(`**: file-assignment.service.ts:44, file-on-student-assignment.service.ts:57, skill.service.ts:39, student-on-assignment.service.ts:76, teacher-on-subject.service.ts:37.
- **`new MemberOnSchoolRepository(`**: member-on-school.service.ts:44, student-on-assignment.service.ts:79, teacher-on-subject.service.ts:36.
- Callers of `SubjectRepository.updateMany` pass the affected ids.
- Remove `redisService` from any service that no longer uses it. Its spec drops that provider.

- [ ] **Step 5: Verify.** `bun run jest` and `bun run build`.

- [ ] **Step 6: Commit**

```bash
git add src/cache src/subject src/student-on-subject src/teacher-on-subject src/member-on-school src/class src/attendance src/attendance-table src/score-on-subject src/score-on-student src/skill-on-student-assignment src/student src/student-on-assignment src/assignment src/file-assignment src/file-on-student-assignment src/skill
git commit -m "feat(cache): roster and school-member writes bump on write"
```

---

### Task 6: Grades scope (ScoreOnSubject, ScoreOnStudent, Grade)

**Files:**
- Create: `src/cache/bumps/grades.bumps.spec.ts`
- Modify: `src/score-on-subject/score-on-subject.repository.ts`, `src/score-on-student/score-on-student.repository.ts`, `src/grade/grade.repository.ts`, and the construction sites

- [ ] **Step 1: Write the failing test** with `const G = subjectScope('s1', 'grades')`:

```ts
const cases = [
  { name: 'ScoreOnSubject.create', run: (c, p) => new ScoreOnSubjectRepository(p, c).createSocreOnSubject({ data: {} as any }), scopes: [G] },
  { name: 'ScoreOnSubject.update', run: (c, p) => new ScoreOnSubjectRepository(p, c).updateScoreOnSubject({ where: { id: 'r1' }, data: {} }), scopes: [G] },
  { name: 'ScoreOnSubject.delete', run: (c, p) => new ScoreOnSubjectRepository(p, c).delete({ scoreOnSubjectId: 'r1' }), scopes: [G] },
  { name: 'ScoreOnStudent.create', run: (c, p) => new ScoreOnStudentRepository(p, c).createSocreOnStudent({ data: {} as any }), scopes: [G] },
  { name: 'ScoreOnStudent.update', run: (c, p) => new ScoreOnStudentRepository(p, c).updateScoreOnStudent({ where: { id: 'r1' }, data: {} }), scopes: [G] },
  { name: 'ScoreOnStudent.delete', run: (c, p) => new ScoreOnStudentRepository(p, c).deleteScoreOnStudent({ scoreOnStudentId: 'r1' }), scopes: [G] },
  { name: 'Grade.create', run: (c, p) => new GradeRepository(p, c).create({ data: {} as any }), scopes: [G] },
  { name: 'Grade.update', run: (c, p) => new GradeRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [G] },
  { name: 'Grade.delete', run: (c, p) => new GradeRepository(p, c).delete({ where: { id: 'r1' } }), scopes: [G] },
];
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Migrate (R1–R3).**
  - Every write bumps `subjectScope(result.subjectId, 'grades')`: ScoreOnSubject `createSocreOnSubject` L111, `updateScoreOnSubject` L136, `delete` L164 (whose result also covers the nested `scoreOnStudent.deleteMany`); ScoreOnStudent `createSocreOnStudent` L99, `updateScoreOnStudent` L119; Grade `create` L28, `update` L126, `delete` L107.
  - `ScoreOnStudentRepository.deleteScoreOnStudent` (L142) must capture the `prisma.scoreOnStudent.delete` return value to get `subjectId`. Keep the method's existing return value unchanged.
  - `ScoreOnStudentRepository` currently has no `redisService` (R1: just add `cache`).

- [ ] **Step 4: Construction sites (R4) and specs (R5)**
  - **`new ScoreOnSubjectRepository(`**: score-on-subject.service.ts:40, subject.service.ts:108.
  - **`new ScoreOnStudentRepository(`**: score-on-student.service.ts:42, student-on-subject.service.ts:87, subject.service.ts:131.
  - **`new GradeRepository(`**: grade.service.ts:33.

- [ ] **Step 5: Verify.** `bun run jest` and `bun run build`.

- [ ] **Step 6: Commit**

```bash
git add src/cache src/score-on-subject src/score-on-student src/grade src/subject src/student-on-subject
git commit -m "feat(cache): grades-scope repositories bump on write"
```

---

### Task 7: Word-cloud scope (WordCloudSet, WordCloud)

**Files:**
- Create: `src/cache/bumps/wordcloud.bumps.spec.ts`
- Modify: `src/word-cloud-set/word-cloud-set.repository.ts`, `src/word-cloud/word-cloud.repository.ts`, `src/word-cloud-set/word-cloud-set.service.ts:42`, `src/word-cloud/word-cloud.service.ts:37`, `src/word-cloud-set/word-cloud-set.repository.spec.ts` (provide `createPassthroughCache()` wherever the repository is built)

**Interfaces:**
- Produces: `WordCloudSetRepository.updateQuestionsBySetId(setId: string, subjectId: string, data)`, which gains `subjectId` as its **second** argument.

- [ ] **Step 1: Write the failing test** with `const W = subjectScope('s1', 'wordcloud')`:

```ts
const cases = [
  { name: 'Set.create', run: (c, p) => new WordCloudSetRepository(p, c).create({ data: {} as any }), scopes: [W] },
  { name: 'Set.update', run: (c, p) => new WordCloudSetRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [W] },
  { name: 'Set.updateQuestionsBySetId', run: (c, p) => new WordCloudSetRepository(p, c).updateQuestionsBySetId('set1', 's1', { status: 'OPEN' } as any), scopes: [W] },
  { name: 'Set.createQuestion', run: (c, p) => new WordCloudSetRepository(p, c).createQuestion({ data: {} as any }), scopes: [W] },
  { name: 'Set.updateQuestion', run: (c, p) => new WordCloudSetRepository(p, c).updateQuestion({ where: { id: 'r1' }, data: {} }), scopes: [W] },
  { name: 'Set.deleteSet', run: (c, p) => new WordCloudSetRepository(p, c).deleteSet('set1'), scopes: [W] },
  { name: 'Set.deleteQuestion', run: (c, p) => new WordCloudSetRepository(p, c).deleteQuestion('q1'), scopes: [W] },
  { name: 'WordCloud.create', run: (c, p) => new WordCloudRepository(p, c).create({ data: {} as any }), scopes: [W] },
  { name: 'WordCloud.update', run: (c, p) => new WordCloudRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [W] },
  { name: 'WordCloud.delete', run: (c, p) => new WordCloudRepository(p, c).delete({ where: { id: 'r1' } }), scopes: [W] },
  { name: 'WordCloud.createAnswer', run: (c, p) => new WordCloudRepository(p, c).createAnswer({ data: {} as any }), scopes: [W] },
];
```

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Migrate.** Neither repository has a Redis parameter today; add `cache` as the last constructor argument.
  - Every result-returning write bumps `subjectScope(result.subjectId, 'wordcloud')`: Set `create` L114, `update` L152, `createQuestion` L238, `updateQuestion` L248, `deleteSet` L279 (result L294), `deleteQuestion` L301 (result L306); WordCloud `create` L62, `update` L70, `delete` L78 (result L83), `createAnswer` L111.
  - `updateQuestionsBySetId` (raw command, L192) bumps the new `subjectId` argument, after the write-error check passes. Update its callers in `word-cloud-set.service.ts` to pass `set.subjectId`.

- [ ] **Step 4: Construction sites:** word-cloud-set.service.ts:42 and word-cloud.service.ts:37 (add `cache`, then R5 for their specs).

- [ ] **Step 5: Verify.** `bun run jest` and `bun run build`.

- [ ] **Step 6: Commit**

```bash
git add src/cache src/word-cloud-set src/word-cloud
git commit -m "feat(cache): word-cloud writes bump on write"
```

---

### Task 8: Bypass writes and guard test

**Files:**
- Create: `src/cache/cache-bypass.guard.spec.ts`
- Modify: `src/attendance-status-list/attendance-status-list.service.ts` (~L163), `src/rubric/rubric.service.ts` (~L196–217), `src/student-on-subject/student-on-subject.service.ts` (~L682), `src/subject/subject.service.ts` (~L374, ~L415, ~L896), `src/webhooks/webhooks.service.ts` (~L105)

- [ ] **Step 1: Write the guard test**

```ts
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
  'attendance-status-list/attendance-status-list.service.ts:attendance.updateMany': 'bumps attendance after the write',
  'rubric/rubric.service.ts:studentOnAssignment.update': 'inside $transaction; bumps submissions after it resolves',
  'student-on-subject/student-on-subject.service.ts:studentOnSubject.update': 'reorder; bumps roster after Promise.allSettled',
  'subject/subject.service.ts:assignment.update': 'duplicate subject; bumps once at the end',
  'subject/subject.service.ts:questionOnVideo.create': 'duplicate subject; bumps once at the end',
  'subject/subject.service.ts:teacherOnSubject.create': 'createSubject; bumps roster after the write',
  'webhooks/webhooks.service.ts:subject.update': 'LINE link; bumps roster after the write',
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
      if (!file.endsWith('.ts') || file.endsWith('.spec.ts') || file.endsWith('.repository.ts')) continue;
      const rel = relative(root, file).split('\\').join('/');
      for (const m of readFileSync(file, 'utf8').matchAll(PATTERN)) {
        const key = `${rel}:${m[1]}.${m[2]}`;
        if (!(key in ALLOWED)) offenders.push(key);
      }
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run** `bun run jest src/cache/cache-bypass.guard.spec.ts`.
Expected: PASS, because all 7 current sites are allow-listed. Then temporarily delete one `ALLOWED` entry and confirm the test FAILS naming that site, then restore it. That proves the scanner works.

- [ ] **Step 3: Write failing tests for the explicit bumps** in each service's existing spec (`createPassthroughCache()` is already provided after Tasks 2–7). Assert `cache.bump` was called with:
  - `attendance-status-list.service.spec.ts`, update with a title change: `subjectScope(status.subjectId, 'attendance')`.
  - `rubric.service.spec.ts`, grading with a rubric: `subjectScope(soa.subjectId, 'submissions')`, **after** `$transaction` resolved. Assert the mock `$transaction` was called before `bump`, using `mock.invocationCallOrder`.
  - `student-on-subject.service.spec.ts`, reorder: `subjectScope(studentOnSubjects[0].subjectId, 'roster')`.
  - `subject.service.spec.ts`, duplicate subject: `subjectScope(<new subject id>, 'assignments')` and `subjectScope(<new subject id>, 'roster')`. Also createSubject: `subjectScope(<created subject id>, 'roster')`.
  - `webhooks.service.spec.ts` (create it if absent, following the module setup of other service specs), LINE link: `subjectScope(subject.id, 'roster')`.

Run these specs. Expected: FAIL.

- [ ] **Step 4: Add the bumps**
  - `attendance-status-list.service.ts`, after `attendance.updateMany` (~L163): `await this.cache.bump(subjectScope(status.subjectId, 'attendance'));`
  - `rubric.service.ts`, directly after `await this.prisma.$transaction(...)` (~L217): `await this.cache.bump(subjectScope(soa.subjectId, 'submissions'));`
  - `student-on-subject.service.ts`, after the `Promise.allSettled` reorder (~L695): `await this.cache.bump(subjectScope(studentOnSubjects[0].subjectId, 'roster'));`
  - `subject.service.ts`:
    - At the end of the duplicate-subject method (the one containing `rubricIdMap`, ~L374/L415), after all copies finish: `await this.cache.bump(subjectScope(<new subject>.id, 'assignments'), subjectScope(<new subject>.id, 'roster'));` using the method's variable for the subject it created.
    - In `createSubject`, after `prisma.teacherOnSubject.create` (~L896): `await this.cache.bump(subjectScope(<created subject>.id, 'roster'));`
  - `webhooks.service.ts`, after `prisma.subject.update` (~L105): `await this.cache.bump(subjectScope(subject.id, 'roster'));` Inject `CacheService` into `WebhooksService` if it lacks it.

- [ ] **Step 5: Confirm no repository still references Redis**

Run: `grep -rn "redisService\|getCacheKey" src --include=*.repository.ts`
Expected: no output. Remaining `redisService` uses in services must be unrelated to these models (for example analytics); leave them.

- [ ] **Step 6: Verify and commit**

Run: `bun run jest` and `bun run build`. Expected: all pass, exit 0.

```bash
git add src/cache src/attendance-status-list src/rubric src/student-on-subject src/subject src/webhooks
git commit -m "feat(cache): bump on bypass writes and guard against new ones"
```

**Rollout step 1 is complete here.** It is deployable on its own: repositories bump, and nothing reads the new cache.

Next: `2026-10-02-service-level-caching-part3.md`, Task 9.
