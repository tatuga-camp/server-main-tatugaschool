import { SubjectReads } from './subject.reads';
import { createTestCache } from '../cache/testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  SubjectScopeKind,
  schoolMembersScope,
  subjectScope,
} from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';

describe('SubjectReads', () => {
  const createAt = new Date('2026-10-01T08:00:00.000Z');

  function setup() {
    const prisma = {
      subject: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', code: 'abc123' }),
      },
      studentOnSubject: { findMany: jest.fn().mockResolvedValue([]) },
      teacherOnSubject: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const { cache, redis } = createTestCache();
    const reads = new SubjectReads(prisma as any, cache);
    return { prisma, cache, redis, reads };
  }

  describe('subjectRoster', () => {
    it('reads the subject without verifyLineToken, its students in order and its teachers, then serves the second call from cache', async () => {
      const { prisma, reads } = setup();
      prisma.subject.findUnique.mockResolvedValue({
        id: 's1',
        code: 'abc123',
        createAt,
      });
      prisma.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos2', order: 1, createAt },
        { id: 'sos1', order: 2, createAt },
      ]);
      prisma.teacherOnSubject.findMany.mockResolvedValue([
        { id: 'tos1', createAt },
      ]);

      const first = await reads.subjectRoster('s1');
      const second = await reads.subjectRoster('s1');

      // The cached copy has the same shape, with dates revived.
      expect(second).toEqual(first);
      expect(second.subject.createAt).toBeInstanceOf(Date);
      expect(second.students[0].createAt).toBeInstanceOf(Date);
      expect(first).toEqual({
        subject: { id: 's1', code: 'abc123', createAt },
        students: [
          { id: 'sos2', order: 1, createAt },
          { id: 'sos1', order: 2, createAt },
        ],
        teachers: [{ id: 'tos1', createAt }],
      });
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.subject.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
        omit: { verifyLineToken: true, publicProgressToken: true },
      });
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        orderBy: { order: 'asc' },
      });
      expect(prisma.teacherOnSubject.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.teacherOnSubject.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
      });
    });

    it('returns a cached null when the subject does not exist, without reading students or teachers', async () => {
      const { prisma, reads } = setup();
      prisma.subject.findUnique.mockResolvedValue(null);

      expect(await reads.subjectRoster('s1')).toBeNull();
      expect(await reads.subjectRoster('s1')).toBeNull();
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnSubject.findMany).not.toHaveBeenCalled();
      expect(prisma.teacherOnSubject.findMany).not.toHaveBeenCalled();
    });

    it('reloads the subject, students and teachers after a roster bump', async () => {
      const { prisma, cache, reads } = setup();

      await reads.subjectRoster('s1');
      await cache.bump(subjectScope('s1', 'roster'));
      await reads.subjectRoster('s1');

      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.teacherOnSubject.findMany).toHaveBeenCalledTimes(2);
    });

    it('returns null after the roster bump that deleted the subject', async () => {
      const { prisma, cache, reads } = setup();

      expect(await reads.subjectRoster('s1')).not.toBeNull();
      prisma.subject.findUnique.mockResolvedValue(null);
      await cache.bump(subjectScope('s1', 'roster'));

      expect(await reads.subjectRoster('s1')).toBeNull();
    });

    it('caches each subject under its own key', async () => {
      const { prisma, reads } = setup();

      await reads.subjectRoster('s1');
      await reads.subjectRoster('s2');

      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.subject.findUnique).toHaveBeenLastCalledWith({
        where: { id: 's2' },
        omit: { verifyLineToken: true, publicProgressToken: true },
      });
    });

    it('stores the roster with the long TTL', async () => {
      const { redis, reads } = setup();

      await reads.subjectRoster('s1');

      expect([...redis.ttl.values()]).toEqual([TTL.LONG]);
    });
  });

  describe('subjectIdByCode', () => {
    it('resolves the code to the subject id and serves the second call from cache', async () => {
      const { prisma, reads } = setup();

      expect(await reads.subjectIdByCode('abc123')).toBe('s1');
      expect(await reads.subjectIdByCode('abc123')).toBe('s1');
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.subject.findUnique).toHaveBeenCalledWith({
        where: { code: 'abc123' },
        select: { id: true },
      });
    });

    it('returns a cached null for an unknown code', async () => {
      const { prisma, reads } = setup();
      prisma.subject.findUnique.mockResolvedValue(null);

      expect(await reads.subjectIdByCode('zzz999')).toBeNull();
      expect(await reads.subjectIdByCode('zzz999')).toBeNull();
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(1);
    });

    it('has no scopes, so no bump reloads it', async () => {
      const { prisma, cache, reads } = setup();

      await reads.subjectIdByCode('abc123');
      await cache.bump(
        ...ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('s1', k)),
        schoolMembersScope('sch1'),
      );
      await reads.subjectIdByCode('abc123');

      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(1);
    });

    it('caches each code under its own key', async () => {
      const { prisma, reads } = setup();

      await reads.subjectIdByCode('abc123');
      await reads.subjectIdByCode('def456');

      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.subject.findUnique).toHaveBeenLastCalledWith({
        where: { code: 'def456' },
        select: { id: true },
      });
    });

    it('stores the mapping with the short TTL', async () => {
      const { redis, reads } = setup();

      await reads.subjectIdByCode('abc123');

      expect([...redis.ttl.values()]).toEqual([TTL.SHORT]);
    });
  });

  describe('forgetCode', () => {
    it('makes the next lookup of that code read Prisma again', async () => {
      const { prisma, reads } = setup();

      expect(await reads.subjectIdByCode('abc123')).toBe('s1');
      prisma.subject.findUnique.mockResolvedValue(null);
      await reads.forgetCode('abc123');

      expect(await reads.subjectIdByCode('abc123')).toBeNull();
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(2);
    });

    it('leaves other codes and the roster cached', async () => {
      const { prisma, reads } = setup();

      await reads.subjectIdByCode('abc123');
      await reads.subjectIdByCode('def456');
      await reads.subjectRoster('s1');
      await reads.forgetCode('abc123');
      await reads.subjectIdByCode('def456');
      await reads.subjectRoster('s1');

      // abc123, def456 and the roster: one read each.
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(3);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // The roster must reload only when its declared scope moves.
  describe('no reload after an unrelated bump', () => {
    const units: {
      name: string;
      call: (r: SubjectReads) => Promise<unknown>;
      mock: (p: any) => jest.Mock;
      declared: SubjectScopeKind[];
    }[] = [
      {
        name: 'subjectRoster',
        call: (r) => r.subjectRoster('s1'),
        mock: (p) => p.studentOnSubject.findMany,
        declared: ['roster'],
      },
    ];

    it.each(units)(
      '$name ignores bumps of its other-kind scopes and of another subject',
      async ({ call, mock, declared }) => {
        const { prisma, cache, reads } = setup();
        const unrelated = ALL_SUBJECT_SCOPE_KINDS.filter(
          (k) => !declared.includes(k),
        );

        await call(reads);
        await cache.bump(
          ...unrelated.map((k) => subjectScope('s1', k)),
          ...ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('s2', k)),
          schoolMembersScope('sch1'),
        );
        await call(reads);

        expect(mock(prisma)).toHaveBeenCalledTimes(1);
      },
    );

    it.each(units)(
      '$name reloads after a bump of each declared scope',
      async ({ call, mock, declared }) => {
        const { prisma, cache, reads } = setup();

        await call(reads);
        for (const kind of declared) {
          await cache.bump(subjectScope('s1', kind));
          await call(reads);
        }

        expect(mock(prisma)).toHaveBeenCalledTimes(1 + declared.length);
      },
    );
  });
});
