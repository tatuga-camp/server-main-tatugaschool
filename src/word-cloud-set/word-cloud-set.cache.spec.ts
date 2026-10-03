import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WordCloudSetService } from './word-cloud-set.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { createTestCache } from '../cache/testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  SubjectScopeKind,
  schoolMembersScope,
  subjectScope,
} from '../cache/cache-scopes';
import { Row, matches } from '../cache/testing/memory-prisma';

// The two public word-cloud polls (unit #12) over a real CacheService:
//   GET word-cloud-sets/:setId/public    scopes: wordcloud, roster
//   GET word-cloud-sets/results/:token   scopes: wordcloud, roster
// Both are unauthenticated, so there is no caller to authorize.
const d = (day: number) => new Date(Date.UTC(2026, 9, day));
const token = 'a'.repeat(32);
const set: Row = {
  id: 'set1',
  createAt: d(1),
  updateAt: d(2),
  title: 'Warm-up',
  status: 'OPEN',
  accessMode: 'STUDENTS_ONLY',
  allowMultiple: false,
  activeWordCloudId: 'q1',
  publicResultsToken: token,
  subjectId: 'sub1',
  schoolId: 'sch1',
  userId: 'u1',
};
const question = (id: string, order: number, accessMode: string): Row => ({
  id,
  createAt: d(1),
  updateAt: d(1),
  question: `Question ${id}?`,
  status: 'OPEN',
  accessMode,
  allowMultiple: false,
  subjectId: 'sub1',
  schoolId: 'sch1',
  userId: 'u1',
  wordCloudSetId: 'set1',
  order,
});
const questions = [
  question('q0', 0, 'STUDENTS_ONLY'),
  question('q1', 1, 'PUBLIC'),
  question('q2', 2, 'PUBLIC'),
];
const answers: Record<string, Row[]> = {
  q0: [
    { text: 'Dog', normalized: 'dog', studentOnSubjectId: 'sos1' },
    { text: 'dog', normalized: 'dog', studentOnSubjectId: 'sos2' },
    { text: 'Cat', normalized: 'cat', studentOnSubjectId: 'sos2' },
  ],
  q1: [{ text: 'Sun', normalized: 'sun', studentOnSubjectId: null }],
  q2: [],
};
const students: Row[] = [
  { id: 'sos1', firstName: 'Ann', lastName: 'B', isActive: true },
  { id: 'sos2', firstName: 'Bo', lastName: 'C', isActive: true },
  { id: 'sos3', firstName: 'Cy', lastName: 'D', isActive: false },
].map((s) => ({ ...s, createAt: d(1), subjectId: 'sub1' }));

async function setup() {
  const { cache } = createTestCache();
  const prisma = {
    // CacheRefs: wordCloudSet(id) uses findUnique, wordCloudToken() findFirst.
    wordCloudSet: {
      findUnique: jest.fn(async () => ({ subjectId: 'sub1' })),
      findFirst: jest.fn(async () => ({ subjectId: 'sub1' })),
    },
    studentOnSubject: {
      findMany: jest.fn(async ({ where }: Row) =>
        students.filter((s) => matches(s, where)),
      ),
    },
  };
  const module = await Test.createTestingModule({
    providers: [
      WordCloudSetService,
      { provide: PrismaService, useValue: prisma },
      { provide: CacheService, useValue: cache },
    ],
  })
    .useMocker(() => ({}))
    .compile();
  const service = module.get(WordCloudSetService);
  const repo = {
    findUnique: jest.fn(async () => set),
    findQuestionsBySetId: jest.fn(async () => questions),
    findSetByPublicResultsToken: jest.fn(async () => set),
    findManyAnswers: jest.fn(
      async ({ where }: Row) => answers[where.wordCloudId],
    ),
  };
  (service as any).repository = repo;
  return {
    cache,
    prisma,
    repo,
    service,
    getPublic: () => service.getPublic({ setId: 'set1' }),
    getResults: () => service.getResultsByToken({ token }),
  };
}

// ── the pre-cache bodies (commit 5cd3e62) ────────────────────────────────
function legacyPublic() {
  const activeOrder =
    questions.find((q) => q.id === set.activeWordCloudId)?.order ?? 0;
  return {
    id: set.id,
    status: set.status,
    accessMode: set.accessMode,
    allowMultiple: set.allowMultiple,
    subjectId: set.subjectId,
    activeWordCloudId: set.activeWordCloudId,
    questions: questions
      .filter((q) => q.order <= activeOrder)
      .map((q) => ({
        id: q.id,
        question: q.question,
        order: q.order,
        status: q.status,
      })),
    students: students.filter(
      (s) => s.subjectId === set.subjectId && s.isActive,
    ),
  };
}

// buildQuestionResults is unchanged by the caching work, so the old mapping
// over it is the old response.
async function legacyResults(service: WordCloudSetService) {
  const results = await (service as any).buildQuestionResults(set.id);
  return {
    title: set.title,
    status: set.status,
    activeWordCloudId: set.activeWordCloudId,
    questions: results.map((r) => ({
      id: r.wordCloud.id,
      question: r.wordCloud.question,
      order: r.wordCloud.order,
      status: r.wordCloud.status,
      words: r.words,
      totalAnswers: r.totalAnswers,
    })),
  };
}

// Bumps that must leave a unit cached: the other kinds of its subject, every
// kind of another subject, and the school's members.
const otherBumps = (declared: SubjectScopeKind[], skip: SubjectScopeKind[]) => [
  ...ALL_SUBJECT_SCOPE_KINDS.filter(
    (k) => !declared.includes(k) && !skip.includes(k),
  ).map((k) => subjectScope('sub1', k)),
  ...ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('sub2', k)),
  schoolMembersScope('sch1'),
];

describe('WordCloudSetService public polls over the cache', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  describe('GET word-cloud-sets/:setId/public', () => {
    const declared: SubjectScopeKind[] = ['wordcloud', 'roster'];

    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { prisma, repo, getPublic } = await setup();
      const legacy = JSON.stringify(legacyPublic());

      expect(JSON.stringify(await getPublic())).toBe(legacy);
      expect(JSON.stringify(await getPublic())).toBe(legacy);
      expect(repo.findUnique).toHaveBeenCalledTimes(1);
      expect(repo.findQuestionsBySetId).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
    });

    it.each(otherBumps(declared, []))(
      'does not reload after a bump of %s',
      async (scope) => {
        const { cache, repo, getPublic } = await setup();
        await getPublic();
        await cache.bump(scope);

        await getPublic();

        expect(repo.findUnique).toHaveBeenCalledTimes(1);
      },
    );

    it('reloads after a bump of each declared scope', async () => {
      const { cache, repo, prisma, getPublic } = await setup();
      await getPublic();

      for (const kind of declared) {
        await cache.bump(subjectScope('sub1', kind));
        await getPublic();
      }

      expect(repo.findUnique).toHaveBeenCalledTimes(1 + declared.length);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(
        1 + declared.length,
      );
    });
  });

  describe('GET word-cloud-sets/results/:token', () => {
    // roster too: STUDENTS_ONLY results embed answerer names read from
    // StudentOnSubject.
    const declared: SubjectScopeKind[] = ['wordcloud', 'roster'];

    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { repo, service, getResults } = await setup();
      const first = JSON.stringify(await getResults());
      const second = JSON.stringify(await getResults());
      expect(repo.findSetByPublicResultsToken).toHaveBeenCalledTimes(1);
      expect(repo.findManyAnswers).toHaveBeenCalledTimes(questions.length);

      const legacy = JSON.stringify(await legacyResults(service));
      expect(first).toBe(legacy);
      expect(second).toBe(legacy);
      expect(JSON.parse(second).questions[0].words[0]).toEqual({
        text: 'Dog',
        normalized: 'dog',
        count: 2,
        students: ['Ann B', 'Bo C'],
      });
    });

    it.each(otherBumps(declared, []))(
      'does not reload after a bump of %s',
      async (scope) => {
        const { cache, repo, getResults } = await setup();
        await getResults();
        await cache.bump(scope);

        await getResults();

        expect(repo.findSetByPublicResultsToken).toHaveBeenCalledTimes(1);
      },
    );

    it('reloads after a bump of each declared scope', async () => {
      const { cache, repo, getResults } = await setup();
      await getResults();

      for (const kind of declared) {
        await cache.bump(subjectScope('sub1', kind));
        await getResults();
      }

      expect(repo.findSetByPublicResultsToken).toHaveBeenCalledTimes(
        1 + declared.length,
      );
    });

    it('shows a renamed student after a roster bump', async () => {
      const { cache, prisma, getResults } = await setup();
      await getResults();
      prisma.studentOnSubject.findMany.mockImplementation(
        async ({ where }: Row) =>
          students
            .filter((s) => matches(s, where))
            .map((s) => (s.id === 'sos1' ? { ...s, firstName: 'Anna' } : s)),
      );
      await cache.bump(subjectScope('sub1', 'roster'));

      const after = await getResults();

      expect(after.questions[0].words[0].students).toEqual(['Anna B', 'Bo C']);
    });
  });
});
