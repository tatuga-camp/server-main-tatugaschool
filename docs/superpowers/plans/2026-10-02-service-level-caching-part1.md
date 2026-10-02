# Service-Level Caching Implementation Plan — Part 1: cache core and invalidation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `CacheService` with versioned scopes, make every cached-model repository bump the right scope after each write, and remove the old repository-level Redis caches. This is rollout step 1: behaviour-neutral, and nothing reads the new cache yet.

**Architecture:** `CacheService` (global Nest module) wraps the existing ioredis `RedisService`. `bump(scope)` runs `INCR ver:<scope>`, and `getOrSet` keys values by the current scope versions. Repositories take a **required** `CacheService` constructor argument and call `bump` after each successful write. This plan has three files, executed in order: part 1 (Tasks 1–2, this file), `2026-10-02-service-level-caching-part2.md` (Tasks 3–8, the remaining repositories, bypass writes and the guard test; together these are rollout step 1), and `2026-10-02-service-level-caching-part3.md` (Tasks 9–17, the cached reads; rollout steps 2–4).

**Tech Stack:** NestJS 10, Prisma 6.19.3 (MongoDB), ioredis 5, Jest 29 + ts-jest (`isolatedModules: true`, so **tests do not type-check; `bun run build` does**), Bun.

**Spec:** `docs/superpowers/specs/2026-10-02-service-level-caching-design.md`

## Global Constraints

- All paths below are relative to `servers/server-main-tatugaschool/`.
- Work on branch `feat/service-level-cache`. Before Task 1, the uncommitted "step 1" changes (embedding omit, Prisma 6.19.3) must already be committed by the user. `package.json` and `bun.lock` also hold unrelated TypeScript 7 alias edits, so never `git add` those files in this plan.
- Commit messages: conventional style (`feat(cache): …`). **No `Co-Authored-By` trailer** (project CLAUDE.md rule).
- Scope strings must be produced only through `subjectScope()` / `schoolMembersScope()` from `src/cache/cache-scopes.ts`. Never hand-write them.
- Bump **after** the write resolves. Inside `$transaction`, bump after the transaction resolves (spec §6.1).
- Files stay under 500 lines.
- Verification after every task: `bun run jest` (all suites pass) **and** `bun run build` (exit 0). The build is the only type check. A missing constructor argument shows up there, not in Jest.

### Repository migration procedure (applies to Tasks 2–7)

- **R1.** Constructor: delete the `redisService` parameter and add `private cache: CacheService` as the **last required** parameter. Keep `prismaReadService` where it already exists.
- **R2.** Delete every old cache artefact: `getCacheKey`, the `if (typeof subjectId === 'string' && this.redisService)` read blocks (keep the plain Prisma call they wrapped), and every `redisService?.del(...)` / `redisService.del(...)` call, including dead `Array.isArray(result)` blocks.
- **R3.** Add the bumps listed in the task's table, immediately after the write resolves and before `return`.
- **R4.** Fix every construction site listed in the task: pass `this.cache` (or `cache` in nested repositories) as the new last argument. If the enclosing service has no `cache`, add `private cache: CacheService` to its constructor. Nest injects it, because `CacheModule` is global.
- **R5.** For every service whose constructor gained `cache`, open its `*.service.spec.ts` and add `{ provide: CacheService, useValue: createPassthroughCache() }` to the `Test.createTestingModule({ providers: [...] })` list. Import it from `../cache/testing/cache-test-utils`.
- **R6.** `bun run build` must list zero errors before committing. Each remaining error names a call site you missed.

## Review Focus

1. **A write that throws must not bump.** Bump placement after `await` guarantees this. Test: Task 2 "does not bump when the write throws".
2. **Redis down during `bump` must not fail the write.** `bump` swallows and logs. Test: Task 1 "bump swallows Redis errors".
3. **`createMany` with an empty `data` array has no subject id.** Bump nothing, and do not throw. Test: Task 2 table entry "createMany with empty data".
4. **Composite deletes (Subject, StudentOnSubject, Assignment) must bump every affected scope,** not just their own. Tests: the Task 2 and Task 5 table entries for `delete`/`deleteSubject`.
5. **`$runCommandRaw` writes are invisible to the guard test.** The WordCloud raw update must bump explicitly. Test: Task 7 table entry `updateQuestionsBySetId`.

---

### Task 1: Cache core

**Files:**
- Create: `src/cache/cache-scopes.ts`, `src/cache/revive-dates.ts`, `src/cache/cache.service.ts`, `src/cache/cache.module.ts`, `src/cache/testing/fake-redis.ts`, `src/cache/testing/cache-test-utils.ts`
- Modify: `src/app.module.ts` (imports list, next to `RedisModule` at ~line 117)
- Test: `src/cache/cache.service.spec.ts`

**Interfaces:**
- Produces:
  - `subjectScope(subjectId: string, kind: SubjectScopeKind): string`
  - `schoolMembersScope(schoolId: string): string`
  - `ALL_SUBJECT_SCOPE_KINDS: SubjectScopeKind[]`
  - `CacheService.getOrSet<T>(name: string, scopes: string[], ttlSeconds: number, loader: () => Promise<T>): Promise<T>`
  - `CacheService.bump(...scopes: string[]): Promise<void>`
  - `CacheService.del(name: string): Promise<void>`
  - `createPassthroughCache(): CacheService` (a jest mock: `getOrSet` calls its loader, `bump`/`del` resolve)
  - `createTestCache(): { cache: CacheService; redis: FakeRedis }`

- [ ] **Step 1: Write the failing test**

`src/cache/cache.service.spec.ts`:

```ts
import { createTestCache } from './testing/cache-test-utils';
import { subjectScope } from './cache-scopes';

describe('CacheService', () => {
  const scope = subjectScope('s1', 'assignments');

  it('calls the loader once and serves the second read from cache', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    expect(await cache.getOrSet('list:s1', [scope], 60, loader)).toEqual([{ id: 'a1' }]);
    expect(await cache.getOrSet('list:s1', [scope], 60, loader)).toEqual([{ id: 'a1' }]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reloads after a bump of a scope the value depends on', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
    await cache.getOrSet('x', [scope], 60, loader);
    await cache.bump(scope);
    expect(await cache.getOrSet('x', [scope], 60, loader)).toBe('new');
  });

  it('does not reload after a bump of an unrelated scope', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue('v');
    await cache.getOrSet('x', [scope], 60, loader);
    await cache.bump(subjectScope('s1', 'roster'));
    await cache.getOrSet('x', [scope], 60, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('passes the TTL to SET', async () => {
    const { cache, redis } = createTestCache();
    await cache.getOrSet('x', [scope], 123, async () => 1);
    expect([...redis.ttl.values()]).toEqual([123]);
  });

  it('round-trips Date values', async () => {
    const { cache } = createTestCache();
    const d = new Date('2026-10-02T03:04:05.678Z');
    await cache.getOrSet('x', [], 60, async () => ({ d }));
    const hit = await cache.getOrSet('x', [], 60, async () => ({ d: null }));
    expect(hit.d).toBeInstanceOf(Date);
    expect((hit.d as Date).toISOString()).toBe(d.toISOString());
  });

  it('caches null and empty-array results', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue(null);
    await cache.getOrSet('n', [], 60, loader);
    expect(await cache.getOrSet('n', [], 60, loader)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('falls back to the loader when Redis fails', async () => {
    const { cache, redis } = createTestCache();
    redis.failing = true;
    expect(await cache.getOrSet('x', [scope], 60, async () => 'live')).toBe('live');
  });

  it('does not cache a loader error', async () => {
    const { cache } = createTestCache();
    await expect(
      cache.getOrSet('x', [], 60, async () => { throw new Error('boom'); }),
    ).rejects.toThrow('boom');
    expect(await cache.getOrSet('x', [], 60, async () => 'ok')).toBe('ok');
  });

  it('bump swallows Redis errors', async () => {
    const { cache, redis } = createTestCache();
    redis.failing = true;
    await expect(cache.bump(scope)).resolves.toBeUndefined();
  });

  it('del removes an unscoped entry', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue('v');
    await cache.getOrSet('code:ABC', [], 60, loader);
    await cache.del('code:ABC');
    await cache.getOrSet('code:ABC', [], 60, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun run jest src/cache/cache.service.spec.ts`
Expected: FAIL, "Cannot find module './testing/cache-test-utils'".

- [ ] **Step 3: Implement**

`src/cache/cache-scopes.ts`:

```ts
export type SubjectScopeKind =
  | 'assignments'
  | 'submissions'
  | 'attendance'
  | 'roster'
  | 'grades'
  | 'wordcloud';

export const ALL_SUBJECT_SCOPE_KINDS: SubjectScopeKind[] = [
  'assignments',
  'submissions',
  'attendance',
  'roster',
  'grades',
  'wordcloud',
];

export function subjectScope(subjectId: string, kind: SubjectScopeKind): string {
  return `subject:${subjectId}:${kind}`;
}

export function schoolMembersScope(schoolId: string): string {
  return `school:${schoolId}:members`;
}
```

`src/cache/revive-dates.ts`:

```ts
// Matches exactly what Date#toJSON emits, which is how Prisma dates serialise.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE.test(value)
    ? new Date(value)
    : value;
}
```

`src/cache/cache.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { reviveDates } from './revive-dates';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    name: string,
    scopes: string[],
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    let key: string;
    try {
      const versions =
        scopes.length > 0
          ? await this.redis.mget(...scopes.map((s) => `ver:${s}`))
          : [];
      key = `cache:${name}:${versions.map((v) => v ?? '0').join('.')}`;
      const hit = await this.redis.get(key);
      if (hit !== null) {
        return JSON.parse(hit, reviveDates) as T;
      }
    } catch (error) {
      this.logger.warn(`cache read failed for ${name}: ${error}`);
      return loader();
    }

    const value = await loader();
    try {
      await this.redis.set(key, JSON.stringify(value ?? null), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`cache write failed for ${name}: ${error}`);
    }
    return value;
  }

  async bump(...scopes: string[]): Promise<void> {
    const unique = [...new Set(scopes)];
    if (unique.length === 0) return;
    try {
      const pipeline = this.redis.pipeline();
      unique.forEach((scope) => pipeline.incr(`ver:${scope}`));
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`cache bump failed for ${unique.join(',')}: ${error}`);
    }
  }

  async del(name: string): Promise<void> {
    try {
      await this.redis.del(`cache:${name}:`);
    } catch (error) {
      this.logger.warn(`cache del failed for ${name}: ${error}`);
    }
  }
}
```

`src/cache/cache.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
```

`src/cache/testing/fake-redis.ts`:

```ts
export class FakeRedis {
  store = new Map<string, string>();
  ttl = new Map<string, number>();
  failing = false;

  private check() {
    if (this.failing) throw new Error('redis unavailable');
  }
  async get(key: string) {
    this.check();
    return this.store.get(key) ?? null;
  }
  async mget(...keys: string[]) {
    this.check();
    return keys.map((k) => this.store.get(k) ?? null);
  }
  async set(key: string, value: string, _ex: 'EX', ttl: number) {
    this.check();
    this.store.set(key, value);
    this.ttl.set(key, ttl);
    return 'OK';
  }
  async del(key: string) {
    this.check();
    return this.store.delete(key) ? 1 : 0;
  }
  pipeline() {
    const keys: string[] = [];
    const chain = {
      incr: (key: string) => {
        keys.push(key);
        return chain;
      },
      exec: async () => {
        this.check();
        return keys.map((key) => {
          const next = Number(this.store.get(key) ?? 0) + 1;
          this.store.set(key, String(next));
          return [null, next];
        });
      },
    };
    return chain;
  }
}
```

`src/cache/testing/cache-test-utils.ts`:

```ts
import { CacheService } from '../cache.service';
import { FakeRedis } from './fake-redis';

export function createTestCache(): { cache: CacheService; redis: FakeRedis } {
  const redis = new FakeRedis();
  return { cache: new CacheService(redis as any), redis };
}

export function createPassthroughCache(): CacheService {
  return {
    getOrSet: jest.fn((_n: string, _s: string[], _t: number, loader: () => Promise<unknown>) => loader()),
    bump: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService;
}
```

In `src/app.module.ts`, add `import { CacheModule } from './cache/cache.module';` and put `CacheModule` in `imports` directly after `RedisModule`.

- [ ] **Step 4: Run it and confirm it passes**

Run: `bun run jest src/cache/cache.service.spec.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Full verification and commit**

Run: `bun run jest` and `bun run build`. Expected: all pass, build exit 0.

```bash
git add src/cache src/app.module.ts
git commit -m "feat(cache): add CacheService with versioned scopes"
```

---

### Task 2: Assignments scope (Assignment, FileAssignment, AssignmentVideoQuiz, SkillOnAssignment)

**Files:**
- Create: `src/cache/testing/prisma-stub.ts`, `src/cache/bumps/assignments.bumps.spec.ts`
- Modify: `src/assignment/assignment.repository.ts`, `src/file-assignment/file-assignment.repository.ts`, `src/assignment-video-quiz/assignment-video-quiz.repository.ts`, `src/skill-on-assignment/skill-on-assignment.repository.ts`, the construction sites listed below, and `src/assignment/assignment.repository.spec.ts` (replace its Redis mock with `createPassthroughCache()`, and delete the test "keys the cache by the projection")

**Interfaces:**
- Consumes: `CacheService.bump`, `subjectScope`, and `createPassthroughCache` from Task 1.
- Produces:
  - `createPrismaStub(record)`, used by Tasks 3–7.
  - `SkillOnAssignmentRepository.deleteByAssignmentId(request: { assignmentId: string; subjectId: string })`, which gains a required `subjectId`.

- [ ] **Step 1: Write the Prisma stub and the failing bump test**

`src/cache/testing/prisma-stub.ts`:

```ts
// Every prisma.<model>.<op> resolves to `record`. findMany resolves to [record],
// *Many writes to { count: 1 }, $transaction runs its array or callback, and
// $runCommandRaw resolves to { ok: 1, n: 1 }.
export function createPrismaStub(record: Record<string, unknown>): any {
  const model = () =>
    new Proxy(
      {},
      {
        get: (_t, op: string) =>
          jest.fn(async () => {
            if (op === 'findMany') return [record];
            if (op.endsWith('Many')) return { count: 1 };
            if (op === 'count') return 1;
            return record;
          }),
      },
    );
  const stub: any = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === '$transaction')
          return async (arg: any) =>
            Array.isArray(arg) ? Promise.all(arg) : arg(stub);
        if (prop === '$runCommandRaw') return jest.fn(async () => ({ ok: 1, n: 1 }));
        return model();
      },
    },
  );
  return stub;
}
```

`src/cache/bumps/assignments.bumps.spec.ts`:

```ts
import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { AssignmentRepository } from '../../assignment/assignment.repository';
import { FileAssignmentRepository } from '../../file-assignment/file-assignment.repository';
import { AssignmentVideoQuizRepository } from '../../assignment-video-quiz/assignment-video-quiz.repository';
import { SkillOnAssignmentRepository } from '../../skill-on-assignment/skill-on-assignment.repository';

const record = { id: 'r1', subjectId: 's1', assignmentId: 'a1', url: 'u', size: 1, contentType: 'TEXT', body: '' };
const storage = { DeleteFileOnStorage: jest.fn() } as any;
const A = subjectScope('s1', 'assignments');
const S = subjectScope('s1', 'submissions');

type Case = { name: string; run: (cache: any, prisma: any) => Promise<unknown>; scopes: string[] };

const cases: Case[] = [
  { name: 'Assignment.create', run: (c, p) => new AssignmentRepository(p, storage, c).create({ data: {} as any }), scopes: [A] },
  { name: 'Assignment.update', run: (c, p) => new AssignmentRepository(p, storage, c).update({ where: { id: 'a1' }, data: {} }), scopes: [A] },
  { name: 'Assignment.delete', run: (c, p) => new AssignmentRepository(p, storage, c).delete({ assignmentId: 'a1' }), scopes: [A, S] },
  { name: 'FileAssignment.create', run: (c, p) => new FileAssignmentRepository(p, storage, c).create({ data: {} as any }), scopes: [A] },
  { name: 'FileAssignment.update', run: (c, p) => new FileAssignmentRepository(p, storage, c).update({ where: { id: 'r1' }, data: {} }), scopes: [A] },
  { name: 'FileAssignment.delete', run: (c, p) => new FileAssignmentRepository(p, storage, c).delete({ fileOnAssignmentId: 'r1' }), scopes: [A] },
  { name: 'FileAssignment.deleteByAssignmentId', run: (c, p) => new FileAssignmentRepository(p, storage, c).deleteByAssignmentId({ assignmentId: 'a1' }), scopes: [A] },
  { name: 'VideoQuiz.create', run: (c, p) => new AssignmentVideoQuizRepository(p, c).create({ data: {} as any }), scopes: [A] },
  { name: 'VideoQuiz.update', run: (c, p) => new AssignmentVideoQuizRepository(p, c).update({ where: { id: 'r1' }, data: {} }), scopes: [A] },
  { name: 'VideoQuiz.createMany', run: (c, p) => new AssignmentVideoQuizRepository(p, c).createMany({ data: [{ subjectId: 's1' } as any] }), scopes: [A] },
  { name: 'VideoQuiz.delete', run: (c, p) => new AssignmentVideoQuizRepository(p, c).delete({ where: { id: 'r1' } }), scopes: [A] },
  { name: 'SkillOnAssignment.create', run: (c, p) => new SkillOnAssignmentRepository(p, c).create({ skillId: 'k', assignmentId: 'a1', subjectId: 's1' }), scopes: [A] },
  { name: 'SkillOnAssignment.delete', run: (c, p) => new SkillOnAssignmentRepository(p, c).delete({ skillOnAssignmentId: 'r1' }), scopes: [A] },
  { name: 'SkillOnAssignment.deleteByAssignmentId', run: (c, p) => new SkillOnAssignmentRepository(p, c).deleteByAssignmentId({ assignmentId: 'a1', subjectId: 's1' }), scopes: [A] },
];

describe('assignments-scope repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    for (const scope of scopes) expect(cache.bump).toHaveBeenCalledWith(scope);
  });

  it('createMany with empty data bumps nothing and does not throw', async () => {
    const cache = createPassthroughCache();
    await new AssignmentVideoQuizRepository(createPrismaStub(record), cache).createMany({ data: [] });
    expect(cache.bump).not.toHaveBeenCalled();
  });

  it('does not bump when the write throws', async () => {
    const cache = createPassthroughCache();
    const prisma: any = { assignment: { update: jest.fn().mockRejectedValue(new Error('db down')) } };
    await expect(
      new AssignmentRepository(prisma, storage, cache).update({ where: { id: 'a1' }, data: {} }),
    ).rejects.toThrow();
    expect(cache.bump).not.toHaveBeenCalled();
  });
});
```

Before running, open each repository and adjust each case's call arguments to match its real method signature. The argument shapes above follow the inventory; the scopes are what matters. Do not change `scopes`.

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun run jest src/cache/bumps/assignments.bumps.spec.ts`
Expected: FAIL. The repositories do not accept or call `cache` yet.

- [ ] **Step 3: Migrate the four repositories (procedure R1–R3)**

| Repository / method | Bump after the write |
|---|---|
| `AssignmentRepository.create` (~L139), `.update` (~L158) | `await this.cache.bump(subjectScope(result.subjectId, 'assignments'))` |
| `AssignmentRepository.delete` (~L205) | At the top, read `const ref = await this.prisma.assignment.findUnique({ where: { id: request.assignmentId }, select: { subjectId: true } })`. Pass `subjectId: ref.subjectId` to `skillOnAssignmentRepository.deleteByAssignmentId`. After the final `prisma.assignment.delete`, call `await this.cache.bump(subjectScope(assignment.subjectId, 'assignments'), subjectScope(assignment.subjectId, 'submissions'))`. The nested `prisma.commentOnAssignment/skillOnStudentAssignment/questionOnVideo/rubricScoreOnStudentAssignment.deleteMany` calls are covered by this bump. |
| `FileAssignmentRepository.create` (~L112), `.update` (~L40) | `subjectScope(result.subjectId, 'assignments')` |
| `FileAssignmentRepository.delete` (~L142) | Use the record from the pre-delete `findUnique`: `subjectScope(file.subjectId, 'assignments')` |
| `FileAssignmentRepository.deleteByAssignmentId` (~L202) | If the pre-read `filesOnAssignments` is non-empty, use `subjectScope(filesOnAssignments[0].subjectId, 'assignments')`. Otherwise bump nothing. |
| `AssignmentVideoQuizRepository.create`, `.update`, `.delete` | `subjectScope(result.subjectId, 'assignments')` |
| `AssignmentVideoQuizRepository.createMany` (~L144) | `const subjectId = Array.isArray(args.data) ? args.data[0]?.subjectId : args.data?.subjectId; if (subjectId) await this.cache.bump(subjectScope(subjectId, 'assignments'));` |
| `SkillOnAssignmentRepository.create` (~L98), `.delete` (~L125) | `subjectScope(result.subjectId, 'assignments')` |
| `SkillOnAssignmentRepository.deleteByAssignmentId` (~L207) | The signature gains `subjectId: string`. Bump `subjectScope(request.subjectId, 'assignments')`. |

Imports in each file: `import { CacheService } from '../cache/cache.service';` and `import { subjectScope } from '../cache/cache-scopes';`.

`AssignmentVideoQuizRepository` is also a DI provider in several modules. Because `CacheService` is global, Nest injects it automatically; only the manual site needs an edit.

- [ ] **Step 4: Fix construction sites (R4) and service specs (R5)**

- **`new AssignmentRepository(`**: assignment.service.ts:99, class.service.ts:65, file-assignment.service.ts:54, file-on-student-assignment.service.ts:60, skill.service.ts:42, skill-on-assignment.service.ts:24, skill-on-student-assignment.service.ts:64, student/student.repository.ts:47 (replace `this.redisService` with a `cache` constructor parameter on `StudentRepository`), student-on-assignment.service.ts:80, student-on-subject.service.ts:115, subject/subject.repository.ts:47 (add a `cache` parameter to `SubjectRepository`. Task 5 completes `SubjectRepository`; here only thread it through).
- **`new FileAssignmentRepository(`**: assignment.repository.ts:64 (pass `this.cache`), assignment.service.ts:95, file-assignment.service.ts:58.
- **`new AssignmentVideoQuizRepository(`**: subject.service.ts:143.
- **`new SkillOnAssignmentRepository(`**: assignment.repository.ts:58 (pass `this.cache`), skill-on-assignment.service.ts:29, skill-on-student-assignment.service.ts:58, subject.service.ts:135.
- Every other call of `deleteByAssignmentId` on `SkillOnAssignmentRepository` must now pass `subjectId`. `bun run build` lists them.

Run `bun run build`, then fix every error it reports by threading `cache` until the output is clean. Then apply R5 to each service spec that fails in `bun run jest` with "Nest can't resolve dependencies … CacheService".

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `bun run jest src/cache src/assignment` and then `bun run jest`.
Expected: all pass.

- [ ] **Step 6: Build and commit**

Run: `bun run build`. Expected: exit 0.

```bash
git add src/cache src/assignment src/file-assignment src/assignment-video-quiz src/skill-on-assignment src/student src/subject src/class src/skill src/skill-on-student-assignment src/student-on-assignment src/student-on-subject src/file-on-student-assignment
git commit -m "feat(cache): assignments-scope repositories bump on write"
```

Next: `2026-10-02-service-level-caching-part2.md`, Task 3.
