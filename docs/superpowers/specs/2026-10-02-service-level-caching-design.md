# Service-level caching

Date: 2026-10-02
Status: approved design, pending spec review
Scope: `server-main-tatugaschool` only

## 1. Goal

Reduce MongoDB Atlas internet egress (billed at $0.12/GB because the API runs on DigitalOcean, not AWS) by serving the hottest reads from Redis. Make caching an explicit service-level decision instead of an implicit side effect of repository query shape.

Success criteria:

- Atlas "Network bytes out" drops measurably after rollout, with request volume similar.
- With no writes in a subject, a repeated poll of the student assignment list, teacher grading view or teacher attendance view reads nothing from Atlas.
- A write is visible on the next read by any user. Freshness is unchanged from today's intent.
- Redis being unavailable never fails a request.

Non-goals: caching per-user endpoints (notifications, `users/me`, `noverify-user`), announcements, analytics (already cached), moving the API to AWS, or adding Redis to the scheduler.

## 2. Current state (verified 2026-10-02)

- 19 repositories contain a `getCacheKey` hash cache: one hash per subject, the JSON-serialised Prisma request as the field, 1 h TTL, `del` on writes.
- **Only 4 are live.** The Redis dependency is optional (`redisService?`), and about 30 call sites construct repositories with `new XRepository(this.prisma)`, so the cache silently does nothing. The live ones are StudentOnSubject, Attendance and AttendanceTable (in the attendance services), AssignmentVideoQuiz, and one StudentOnAssignment instance inside `student-on-subject.repository.ts`.
- Live caches return dates as strings, because values are plain `JSON.parse`d.
- 7 writes bypass repositories (§6.2), and the scheduler's clean-up job hard-deletes subject data directly (§6.3).
- Hot uncached paths:
  - student assignment list, polled every 60 s;
  - teacher grading view, 5 s;
  - teacher attendance view, 5 s;
  - student comments, 10 s;
  - word cloud, 4 s;
  - `ValidateAccess` on every teacher request, which makes 3 Atlas reads.
- The student assignment list reads every StudentOnAssignment row in the subject, including answer `body`, only to compute per-assignment counts.

## 3. Architecture

Rule: **repositories announce changes; services decide what to cache.**

### 3.1 `CacheModule` / `CacheService`

A global Nest module exporting `CacheService`, built on the existing `RedisService` (ioredis).

```ts
type Scope = string; // e.g. 'subject:<id>:submissions'

getOrSet<T>(
  name: string,            // e.g. 'subjectAssignments:<subjectId>'
  scopes: Scope[],         // version counters this value depends on
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T>;

bump(...scopes: Scope[]): Promise<void>;
del(name: string): Promise<void>;
```

- `getOrSet`:
  1. `MGET ver:<scope>...` (missing counters read as `0`).
  2. Build the key `cache:<name>:<v1>.<v2>...`.
  3. `GET` the key. On a hit, return the revived value.
  4. On a miss, call `loader()`, `SET key value EX ttl`, and return the value.
- `bump`: `INCR ver:<scope>` for each scope, pipelined. Version keys have no TTL. They are tiny, one per subject and data type.
- Version-in-key means invalidation never deletes cached values. Superseded keys become unreachable and expire on their TTL.
- Serialisation: `JSON.stringify` on write. On read, a reviver converts strings that exactly match `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$` (Prisma's `Date` serialisation) back to `Date`.
- Failure: any Redis error in `getOrSet` logs a warning and returns `loader()`. Any Redis error in `bump` logs an error and does not throw, because the write already committed. The TTL bounds staleness in that case.

### 3.2 Version scopes

| Scope | Bumped by writes to |
|---|---|
| `subject:<id>:assignments` | Assignment, FileOnAssignment, QuestionOnVideo, SkillOnAssignment |
| `subject:<id>:submissions` | StudentOnAssignment, FileOnStudentAssignment, CommentOnAssignment |
| `subject:<id>:attendance` | AttendanceTable, AttendanceRow, Attendance, AttendanceStatusList |
| `subject:<id>:roster` | Subject, StudentOnSubject, TeacherOnSubject |
| `subject:<id>:grades` | ScoreOnSubject, ScoreOnStudent, GradeRange |
| `subject:<id>:wordcloud` | WordCloudSet, WordCloud, WordCloudAnswer |
| `school:<id>:members` | MemberOnSchool |

Per-type scopes keep a student's submission from evicting roster, attendance and assignment caches during class.

## 4. Cache units

Each unit is a service-level method wrapping `getOrSet`. TTLs are a safety net; versions provide freshness.

| # | Unit (key inputs) | Value | Scopes | TTL | Serves |
|---|---|---|---|---|---|
| 1 | `access(subjectId, userId)` | `ValidateAccess` result (`TeacherOnSubject \| 'admin-school'`) | roster, school members | 10 min | every teacher request |
| 2 | `assignmentRef(assignmentId)` | `{ subjectId, schoolId }` | none (immutable) | 24 h | resolving a subject from an assignment id |
| 3 | `subjectAssignments(subjectId)` | all assignments (vectors omitted) + FileOnAssignment + QuestionOnVideo | assignments | 1 h | teacher and student assignment lists, both overviews |
| 4 | `submissionCounts(subjectId)` | `groupBy(['assignmentId','status','isAssigned'])` with `_count` | submissions | 1 h | assignment list counts |
| 5 | `studentSubmissions(subjectId, studentOnSubjectId)` | that student's StudentOnAssignment rows | submissions | 1 h | student list and student overview |
| 6 | `assignmentSubmissions(assignmentId)` | StudentOnAssignment rows + FileOnStudentAssignment for one assignment | submissions | 10 min | teacher grading view |
| 7 | `subjectRoster(subjectId)` | Subject (`verifyLineToken` omitted) + StudentOnSubject[] + TeacherOnSubject[] | roster | 1 h | subject by id and code, roster endpoints |
| 8 | `subjectIdByCode(code)` | subject id | none (self-checking, §6.1) | 10 min | public subject-by-code endpoint |
| 9 | `attendanceTable(tableId)` | table + rows + attendances | attendance | 10 min | teacher and student attendance views |
| 10 | `subjectGrades(subjectId)` | GradeRange + ScoreOnSubject[] | grades | 1 h | both overviews |
| 11 | `submissionComments(studentOnAssignmentId)` | CommentOnAssignment[] | submissions | 10 min | student comment section |
| 12 | `wordCloud(setId)`, `wordCloudResults(token)` | set + questions (+ answers for results) | wordcloud | 5 min | word-cloud public and results polls |

Units 6, 9, 11 and 12 need the subject id to resolve their scopes. They get it from #2 or from an equivalent immutable ref for tables and sets (`attendanceTableRef`, `wordCloudSetRef`, 24 h, no scopes).

### 4.1 Endpoint composition

- **`GET assignments/student/subject/:id`**: StudentOnSubject lookup from #7's roster, then #5, #3 filtered to the student's assigned and published ids, then #4. No Atlas read when nothing has changed.
- **`GET assignments/subject/:id`** (teacher): #1, #3, #4.
- **Student overview**: #3 filtered to published `Assignment`, #5, #10, plus the student's ScoreOnStudent rows (not cached; small).
- **Teacher overview**: #1, #3, #10, plus a StudentOnAssignment read narrowed with `select` to `id, assignmentId, studentOnSubjectId, score, status, isAssigned` (no `body`), and ScoreOnStudent rows.
- **`GET student-on-assignments/assignment/:id`** (grading): #2, #1, #6.
- **`GET attendance-rows/attendance-table/:id`**: table ref, #1, #9.
- **`GET subjects/code/:code`**: #8, then #7.
- **`GET subjects/student/subject/:id`**: #7.

### 4.2 Query and behaviour changes bundled with caching

- #4 replaces the full read of every StudentOnAssignment row in the subject. Counts must match the old in-memory computation: `SUBMITTED`, `PENDDING && isAssigned`, `REVIEWD`, and the total.
- The teacher overview's StudentOnAssignment read drops `body` via `select`.
- `StudentOnAssignmentService.getByAssignmentId` replaces its own access check with cached `ValidateAccess`. **Behaviour change (approved):** an invited teacher whose TeacherOnSubject `status !== 'ACCEPT'` is now refused. This also removes the crash when `memberOnSchool` is null.

## 5. Removal of repository caching

All 19 `getCacheKey` implementations, and their `hget`/`hset`/`expire`/`del` calls, are removed. Repository reads become plain Prisma calls. Each write site that today calls `redisService?.del(getCacheKey(...))` calls `cache.bump(<scope>)` instead.

The repository constructor parameter becomes **required** `CacheService`, not optional, so the compiler flags every `new XRepository(...)` call site. Repositories that only read (no writes to cached models) do not take it.

## 6. Invalidation rules

1. **Bump after commit.** Write first, then `bump`. Inside `$transaction`, the service bumps once after the transaction resolves, never inside the callback. Combined with version-in-key, this makes a concurrent "read old data, then store it" harmless: the stale value lands under the superseded key.
2. **Loaders read from the primary.** Cache loaders use `PrismaService`, not `PrismaReadService`, so a miss right after a bump cannot cache replica-lagged data under the new version.
3. **Subject id source.** Use `result.subjectId` for single-record writes. For `updateMany`/`deleteMany`, use `where.subjectId`. Where neither is available (for example `deleteByAssignmentId`), the method signature gains a required `subjectId` argument.
4. **MemberOnSchool writes** bump `school:<schoolId>:members`.

### 6.1 Subject code mapping

`subjectIdByCode` is self-checking rather than invalidated. After loading #7 for the cached id, if `subject.code !== code` or the subject is missing, `del` the mapping and resolve the code again from Atlas.

### 6.2 Writes that bypass repositories

Each one either routes through its repository or adds an explicit bump after the write:

| Location | Write | Bump |
|---|---|---|
| `attendance-status-list.service.ts:163` | `attendance.updateMany` | attendance |
| `rubric.service.ts:213` | `tx.studentOnAssignment.update` | submissions, after the transaction |
| `student-on-subject.service.ts:684` | `studentOnSubject.update` | roster |
| `subject.service.ts:374`, `:415`, `:896` | duplicate-subject writes | assignments + roster, once at the end of duplication |
| `webhooks.service.ts:105` | `subject.update` (LINE link) | roster |
| `word-cloud-set.repository.ts:201` | raw `update` on WordCloud | wordcloud |

### 6.3 Scheduler (accepted gap)

`tatuga-camp/scheduler` clean-up hard-deletes subject data with direct Prisma calls and has no Redis. It only deletes subjects that were already soft-deleted through server-main, which bumped `roster`. Residual cached data for a deleted subject is unreachable in practice and expires within 1 h. No scheduler change.

## 7. Error handling

- Redis read or write failure in `getOrSet`: warn and fall through to the loader.
- Redis failure in `bump`: log an error and continue. Staleness is bounded by the unit's TTL (at most 1 h; 10 min for access).
- Loader errors propagate unchanged and are not cached. Empty results (`[]`, `null`) **are** cached, unlike today's repository cache, because "no assignments" is a valid hot answer.
- Exception: `access` caches only successful results. `NotFoundException` and `ForbiddenException` are not cached.

## 8. Testing

- **`CacheService` unit tests** (in-memory fake of `get`/`set`/`mget`/`incr`): hit skips loader; bump forces reload; TTL passed to `SET`; `Date` round-trip; Redis error falls back to loader; loader error is not cached.
- **Repository bump tests:** a table-driven test per repository asserting each write method bumps the expected scope with the expected subject id.
- **Cache unit tests:** each unit's key inputs and scope list; endpoint compositions in §4.1 return the same shape as before.
- **`submissionCounts` parity test** against the old in-memory computation.
- **Guard test:** a Jest test that scans `src/**/*.ts` (excluding `*.repository.ts` and specs) for `prisma|tx|this.prisma.<cachedModel>.<create|update|delete|upsert|createMany|updateMany|deleteMany>`. It fails on any match not in an allow-list with a reason comment. This prevents new invalidation bypasses.
- **Existing suite:** all current tests pass (873 at time of writing), updated where they asserted repository caching.

## 9. Rollout and verification

1. Ship `CacheModule`, required repository wiring, scope bumps (§5, §6) and the guard test. Nothing reads the new cache yet, so this is behaviour-neutral apart from removing the 4 live repository caches.
2. Ship units #1, #3, #4, #5 and §4.2 (access check, assignment list, counts).
3. Ship #6 and #9 (grading and attendance 5 s polls).
4. Ship #7, #8, #10, #11 and #12.

After each step, compare Atlas "Network bytes out" (Production-Tatuga-School) with the previous week, and check `redis-cli INFO stats` (`keyspace_hits` / `keyspace_misses`).

## 10. Open risks

- Version-key growth: one key per subject per scope (≤ 7 per subject). Negligible.
- Cache memory: superseded values linger until TTL. Bounded by the TTLs above; Redis `maxmemory-policy` should be `allkeys-lru` or `volatile-lru`, to be verified on the DigitalOcean Redis instance before step 2.
- Busy word-cloud sessions bump `wordcloud` on every answer, so cache benefit depends on reads outnumbering writes (N students polling every 4 s versus answer rate). Measure after step 4, and drop #12 if the hit rate is poor.
