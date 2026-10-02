# Service-Level Caching Implementation Plan — Part 4: grading, attendance, roster, comments, word cloud

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-10-02-service-level-caching-design.md`

**Read first:** part 1 **Global Constraints**, and part 3 **Rules L1–L5** and **Review Focus**. Those apply to every task here. Tasks 1–11 must be complete; they provide `CacheRefs`, `TTL`, `AssignmentReads` and `GradeReads`.

---

### Task 12: Teacher grading view, unit #6 (rollout step 3)

**Files:** Modify `src/assignment/assignment.reads.ts` (add a method) and `src/student-on-assignment/student-on-assignment.service.ts` (`getByAssignmentId`, L115–170). Test in `src/assignment/assignment.reads.spec.ts` and `src/student-on-assignment/student-on-assignment.service.spec.ts`.

**Interfaces:** Produces `AssignmentReads.assignmentSubmissions(subjectId, assignmentId)`, which returns `(StudentOnAssignment & { files: FileOnStudentAssignment[] })[]`.

- [ ] **Step 1: Failing tests.**
  - The reads method follows L4: a submissions bump reloads.
  - Service:
    - An unknown assignment (`refs.assignment` → null) gives `NotFoundException`.
    - **A deleted assignment → 404**: the ref still returns `{subjectId}`, but `subjectAssignments` no longer lists the id, so `NotFoundException`.
    - A teacher whose `ValidateAccess` rejects gets `ForbiddenException`. This is the approved stricter rule: an invited-but-not-accepted teacher is refused.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
assignmentSubmissions(subjectId: string, assignmentId: string) {
  return this.cache.getOrSet(`assignmentSubmissions:${assignmentId}`, [subjectScope(subjectId, 'submissions')], TTL.SHORT, async () => {
    const rows = await this.prisma.studentOnAssignment.findMany({ where: { assignmentId } });
    const files = rows.length
      ? await this.prisma.fileOnStudentAssignment.findMany({ where: { studentOnAssignmentId: { in: rows.map((r) => r.id) } } })
      : [];
    return rows.map((r) => ({ ...r, files: files.filter((f) => f.studentOnAssignmentId === r.id) }));
  });
}
```

Service body:

```ts
const ref = await this.refs.assignment(dto.assignmentId);
if (!ref) throw new NotFoundException('Assignment not found');
await this.teacherOnSubjectService.ValidateAccess({ userId: user.id, subjectId: ref.subjectId });
const { assignments } = await this.reads.subjectAssignments(ref.subjectId);
if (!assignments.some((a) => a.id === dto.assignmentId)) throw new NotFoundException('Assignment not found');
return this.reads.assignmentSubmissions(ref.subjectId, dto.assignmentId);
```

Inject `TeacherOnSubjectService` if the service does not already have it, and construct `refs` and `reads`. Remove the now-unused `memberOnSchoolRepository` / `teacherOnSubjectRepository` reads from this method only.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.
- [ ] **Step 5: Commit** `git add src/assignment src/student-on-assignment && git commit -m "feat(cache): cache teacher grading view"`

---

### Task 13: Attendance unit #9 and subject tables

**Files:**
- Create: `src/attendance-table/attendance.reads.ts`, `src/attendance-table/attendance.reads.spec.ts`
- Modify:
  - `src/attendance-row/attendance-row.service.ts` (`GetAttendanceRows`, L66–113)
  - `src/attendance-table/attendance-table.service.ts` (`getBySubjectId` L73–119 and `getBySubjectIdOnStudentOnSubject` L121+)
  - their specs

**Interfaces:** Produces `AttendanceReads(prisma, cache)` with these methods:
- `tables(subjectId)` returns `(AttendanceTable & { statusLists })[]`
- `tableRows(subjectId, tableId)` returns `(AttendanceRow & { attendances })[] | null`
- `studentAttendance(subjectId, studentOnSubjectId)` returns `{ rows, attendances }`

All scoped to `subjectScope(subjectId, 'attendance')` with `TTL.SHORT`.

This is a deliberate refinement of spec #9. The student view is cached per student, so a cached value never holds other students' attendance.

- [ ] **Step 1: Failing tests.**
  - The reads follow L4.
  - `tableRows` returns `null` when `attendanceTable.findUnique` returns null, and the service then throws `NotFoundException('Attendance table not found')`.
  - `GetAttendanceRows` calls `ValidateAccess` with `ref.subjectId`.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement the loaders.** They use `this.prisma` (L1), because the repositories read from the replica.
  - **`tables`**: `attendanceTable.findMany({ where: { subjectId } })`, plus `attendanceStatusList.findMany({ where: { attendanceTableId: { in } } })`, merged exactly as `getBySubjectId` merges them today.
  - **`tableRows`**: `attendanceTable.findUnique({ where: { id: tableId }, select: { id: true } })`, then `attendanceRow.findMany({ where: { attendanceTableId: tableId } })`, then `attendance.findMany({ where: { attendanceRowId: { in } } })`, merged as in `GetAttendanceRows` today.
  - **`studentAttendance`**: the rows and the student's `attendance.findMany({ where: { attendanceTableId: { in }, studentOnSubjectId } })` for the subject's tables, exactly as `getBySubjectIdOnStudentOnSubject` queries them now.

  Then the services:
  - **`GetAttendanceRows`**: `refs.attendanceTable(id)` (`NotFoundException` when null), then `ValidateAccess`, then `reads.tableRows`.
  - **`getBySubjectId`**: `refs.subject` (`NotFoundException`), then `ValidateAccess`, then `reads.tables`.
  - **`getBySubjectIdOnStudentOnSubject`**: keep the `student.id` check. Use `AssignmentReads.enrollment` (construct `new AssignmentReads(this.prisma, this.cache)`) instead of `findFirst`. Then `reads.tables(subjectId)` and `reads.studentAttendance(subjectId, enrollment.id)`, merged into the current return shape.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.
- [ ] **Step 5: Commit** `git add src/attendance-table src/attendance-row && git commit -m "feat(cache): cache attendance views"`

**Rollout step 3 complete.**

---

### Task 14: Roster units #7 and #8 (rollout step 4)

**Files:**
- Create: `src/subject/subject.reads.ts`, `src/subject/subject.reads.spec.ts`
- Modify:
  - `src/subject/subject.service.ts` (`getSubjectWithTeacherAndStudent`, ~L674–717)
  - `src/student-on-subject/student-on-subject.service.ts` (`getStudentOnSubjectsBySubjectId`, L459–483)
  - their specs

**Interfaces:** Produces `SubjectReads(prisma, cache)` with:
- `subjectRoster(subjectId)` returns `{ subject; students; teachers } | null`, where `subject` omits `verifyLineToken` and `students` is ordered by `order` ascending.
- `subjectIdByCode(code)` returns `string | null`.
- `forgetCode(code)` returns `Promise<void>`.

- [ ] **Step 1: Failing tests.**
  - The reads follow L4: a roster bump reloads, and `subjectIdByCode` is cached with no scopes.
  - Service tests:
    - Code to roster: two calls make one `subject.findUnique` on `code`.
    - **Changed code**: the cached mapping `OLD→s1` while the roster's `subject.code === 'NEW'` makes `getSubjectWithTeacherAndStudent({ code: 'OLD' })` call `forgetCode('OLD')` and then reject with `NotFoundException` when Prisma no longer finds `OLD`.
    - `{ code: 'NEW' }` resolves.
    - The response has no `verifyLineToken`.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
subjectRoster(subjectId: string) {
  return this.cache.getOrSet(`subjectRoster:${subjectId}`, [subjectScope(subjectId, 'roster')], TTL.LONG, async () => {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId }, omit: { verifyLineToken: true } });
    if (!subject) return null;
    const [students, teachers] = await Promise.all([
      this.prisma.studentOnSubject.findMany({ where: { subjectId }, orderBy: { order: 'asc' } }),
      this.prisma.teacherOnSubject.findMany({ where: { subjectId } }),
    ]);
    return { subject, students, teachers };
  });
}
subjectIdByCode(code: string) {
  return this.cache.getOrSet(`subjectCode:${code}`, [], TTL.SHORT, async () =>
    (await this.prisma.subject.findUnique({ where: { code }, select: { id: true } }))?.id ?? null,
  );
}
forgetCode(code: string) {
  return this.cache.del(`subjectCode:${code}`);
}
```

Service:

```ts
async getSubjectWithTeacherAndStudent(dto: { code?: string; subjectId?: string }) {
  let roster = await this.resolveRoster(dto);
  if (dto.code && roster && roster.subject.code !== dto.code) {
    await this.subjectReads.forgetCode(dto.code);
    roster = await this.resolveRoster(dto);
    if (roster && roster.subject.code !== dto.code) roster = null;
  }
  if (!roster) throw new NotFoundException('Subject not found');
  return { ...roster.subject, studentOnSubjects: roster.students, teacherOnSubjects: roster.teachers };
}

private async resolveRoster(dto: { code?: string; subjectId?: string }) {
  const id = dto.code ? await this.subjectReads.subjectIdByCode(dto.code) : dto.subjectId;
  return id ? this.subjectReads.subjectRoster(id) : null;
}
```

`getStudentOnSubjectsBySubjectId`: after `ValidateAccess`, return `(await this.subjectReads.subjectRoster(dto.subjectId))?.students ?? []`.

The step-1 test asserting `omit: { verifyLineToken: true }` on `subjectRepository.findUnique` is replaced by the "response has no `verifyLineToken`" test above.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.
- [ ] **Step 5: Commit** `git add src/subject src/student-on-subject && git commit -m "feat(cache): cache subject roster and code lookup"`

---

### Task 15: Submission comments, unit #11

**Files:** Modify `src/comment-assignment/comment-assignment.service.ts` (`getByStudentOnAssignment`, L43–78) and its spec.

- [ ] **Step 1: Failing tests:**
  - Two calls make one `commentOnAssignment.findMany`.
  - A `submissions` bump reloads.
  - A student who isn't the owner gets `ForbiddenException`.
  - **Deleted submission → 404**: the ref is cached, the loader's `studentOnAssignment.findUnique` returns null, and the service throws `NotFoundException('studentOnAssignment is not found')`.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
const ref = await this.refs.submission(dto.studentOnAssignmentId);
if (!ref) throw new NotFoundException('studentOnAssignment is not found');
if (user) await this.teacherOnSubjectService.ValidateAccess({ subjectId: ref.subjectId, userId: user.id });
if (student && ref.studentId !== student.id) throw new ForbiddenException("You don't have permission to access");
const comments = await this.cache.getOrSet(
  `submissionComments:${dto.studentOnAssignmentId}`,
  [subjectScope(ref.subjectId, 'submissions')],
  TTL.SHORT,
  async () => {
    const exists = await this.prisma.studentOnAssignment.findUnique({ where: { id: dto.studentOnAssignmentId }, select: { id: true } });
    if (!exists) return null;
    return this.prisma.commentOnAssignment.findMany({ where: { studentOnAssignmentId: dto.studentOnAssignmentId } });
  },
);
if (!comments) throw new NotFoundException('studentOnAssignment is not found');
return comments;
```

If `CommentAssignmentRepository.findMany` applies an `orderBy` or `include`, copy it into the loader's `findMany` so the response shape is unchanged.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.
- [ ] **Step 5: Commit** `git add src/comment-assignment && git commit -m "feat(cache): cache submission comments"`

---

### Task 16: Word cloud, unit #12

**Files:** Modify `src/word-cloud-set/word-cloud-set.service.ts` (`getPublic` L395–436, `getResultsByToken` L438–463) and its spec.

- [ ] **Step 1: Failing tests:**
  - `getPublic` twice makes one `repository.findUnique`.
  - A `wordcloud` bump reloads.
  - A `roster` bump also reloads, because the STUDENTS_ONLY student list comes from the roster.
  - **Revoked token → 404**: the cached token ref still returns `{subjectId}`. After `bump(subjectScope('s1','wordcloud'))`, `findSetByPublicResultsToken` returns null and the service throws `NotFoundException`.

- [ ] **Step 2: Run.** Expected: FAIL.

- [ ] **Step 3: Implement**
  - Move the current bodies into private loaders `loadPublic(setId)` and `loadResults(token)`. Each returns `null` where it used to throw `NotFoundException` (L2).
  - **`getPublic`**:
    1. `ref = await this.refs.wordCloudSet(param.setId)`. If null, throw `NotFoundException('Word cloud set not found')`.
    2. `const v = await this.cache.getOrSet(\`wordCloudPublic:${param.setId}\`, [subjectScope(ref.subjectId,'wordcloud'), subjectScope(ref.subjectId,'roster')], TTL.WORDCLOUD, () => this.loadPublic(param.setId))`.
    3. If `v` is null, throw the same exception. Otherwise return `v`.
  - **`getResultsByToken`**: the same pattern, with `refs.wordCloudToken(dto.token)`, key `wordCloudResults:${dto.token}`, scope `wordcloud` only, and the exception message `'This link is no longer available'`.

- [ ] **Step 4: Verify.** `bun run jest` and `bun run build`.
- [ ] **Step 5: Commit** `git add src/word-cloud-set && git commit -m "feat(cache): cache word cloud polls"`

**Rollout step 4 complete.**

---

### Task 17: Final verification

- [ ] **Step 1:** Run `bun run jest`, `bun run build` and `bun run lint`. Expected: all pass. The guard test from Task 8 is green.
- [ ] **Step 2: Local smoke test.** Start Mongo and Redis (`docker compose up -d`; add a `redis:7` service locally if `docker-compose.yaml` lacks one, without committing it). Then run `bun run start:dev`. With a teacher token:
  - `curl` `GET /v1/assignments/subject/<id>` twice. `redis-cli --scan --pattern 'cache:subjectAssignments:*'` shows one key.
  - Create an assignment. `redis-cli GET ver:subject:<id>:assignments` has increased, and the next `GET` lists the new assignment.
- [ ] **Step 3: Payload check.** `curl -s .../v1/assignments/student/subject/<id> | wc -c` before and after Task 10, on the same data. Record both numbers in the PR description.
- [ ] **Step 4: Ops check, for the user.** Confirm the DigitalOcean Redis eviction policy is `allkeys-lru` or `volatile-lru`, in the DO dashboard under Settings → Eviction policy, before deploying step 2.
- [ ] **Step 5:** Use superpowers:finishing-a-development-branch.
