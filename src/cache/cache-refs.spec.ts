import { CacheRefs } from './cache-refs';
import { createTestCache } from './testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  schoolMembersScope,
  subjectScope,
} from './cache-scopes';

describe('CacheRefs', () => {
  function setup() {
    const prisma = {
      assignment: { findUnique: jest.fn() },
      subject: { findUnique: jest.fn() },
      attendanceTable: { findUnique: jest.fn() },
      studentOnAssignment: { findUnique: jest.fn() },
      wordCloudSet: { findUnique: jest.fn(), findFirst: jest.fn() },
    };
    const { cache } = createTestCache();
    const refs = new CacheRefs(prisma as any, cache);
    return { prisma, refs, cache };
  }

  it('assignment() reads Prisma once across two calls', async () => {
    const { prisma, refs } = setup();
    prisma.assignment.findUnique.mockResolvedValue({
      subjectId: 's1',
      schoolId: 'sch1',
    });

    const first = await refs.assignment('a1');
    const second = await refs.assignment('a1');

    expect(first).toEqual({ subjectId: 's1', schoolId: 'sch1' });
    expect(second).toEqual(first);
    expect(prisma.assignment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.assignment.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
      select: { subjectId: true, schoolId: true },
    });
  });

  it('caches a missing id as null', async () => {
    const { prisma, refs } = setup();
    prisma.assignment.findUnique.mockResolvedValue(null);

    expect(await refs.assignment('missing')).toBeNull();
    expect(await refs.assignment('missing')).toBeNull();
    expect(prisma.assignment.findUnique).toHaveBeenCalledTimes(1);
  });

  it('wordCloudToken() looks up by publicResultsToken', async () => {
    const { prisma, refs } = setup();
    prisma.wordCloudSet.findFirst.mockResolvedValue({ subjectId: 's1' });

    expect(await refs.wordCloudToken('tok')).toEqual({ subjectId: 's1' });
    expect(prisma.wordCloudSet.findFirst).toHaveBeenCalledWith({
      where: { publicResultsToken: 'tok' },
      select: { subjectId: true },
    });
  });

  it('wordCloudToken() returns null for an empty token without querying', async () => {
    const { prisma, refs } = setup();

    expect(await refs.wordCloudToken('')).toBeNull();
    expect(prisma.wordCloudSet.findFirst).not.toHaveBeenCalled();
  });

  describe('each ref is cached and ignores scope bumps', () => {
    const cases: {
      name: string;
      call: (refs: CacheRefs) => Promise<unknown>;
      mock: (prisma: any) => jest.Mock;
      args: unknown;
      value: unknown;
    }[] = [
      {
        name: 'assignment',
        call: (r) => r.assignment('a1'),
        mock: (p) => p.assignment.findUnique,
        args: {
          where: { id: 'a1' },
          select: { subjectId: true, schoolId: true },
        },
        value: { subjectId: 's1', schoolId: 'sch1' },
      },
      {
        name: 'subject',
        call: (r) => r.subject('s1'),
        mock: (p) => p.subject.findUnique,
        args: { where: { id: 's1' }, select: { schoolId: true } },
        value: { schoolId: 'sch1' },
      },
      {
        name: 'attendanceTable',
        call: (r) => r.attendanceTable('t1'),
        mock: (p) => p.attendanceTable.findUnique,
        args: { where: { id: 't1' }, select: { subjectId: true } },
        value: { subjectId: 's1' },
      },
      {
        name: 'submission',
        call: (r) => r.submission('soa1'),
        mock: (p) => p.studentOnAssignment.findUnique,
        args: {
          where: { id: 'soa1' },
          select: { subjectId: true, studentId: true },
        },
        value: { subjectId: 's1', studentId: 'st1' },
      },
      {
        name: 'wordCloudSet',
        call: (r) => r.wordCloudSet('w1'),
        mock: (p) => p.wordCloudSet.findUnique,
        args: { where: { id: 'w1' }, select: { subjectId: true } },
        value: { subjectId: 's1' },
      },
      {
        name: 'wordCloudToken',
        call: (r) => r.wordCloudToken('tok'),
        mock: (p) => p.wordCloudSet.findFirst,
        args: {
          where: { publicResultsToken: 'tok' },
          select: { subjectId: true },
        },
        value: { subjectId: 's1' },
      },
    ];

    it.each(cases)(
      '$name() serves the second call from cache',
      async ({ call, mock, args, value }) => {
        const { prisma, refs } = setup();
        mock(prisma).mockResolvedValue(value);

        expect(await call(refs)).toEqual(value);
        expect(await call(refs)).toEqual(value);
        expect(mock(prisma)).toHaveBeenCalledTimes(1);
        expect(mock(prisma)).toHaveBeenCalledWith(args);
      },
    );

    it.each(cases)(
      '$name() does not reload after any subject or school scope bump',
      async ({ call, mock, value }) => {
        const { prisma, refs, cache } = setup();
        mock(prisma).mockResolvedValue(value);

        await call(refs);
        await cache.bump(
          ...ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('s1', k)),
          schoolMembersScope('sch1'),
        );
        await call(refs);

        expect(mock(prisma)).toHaveBeenCalledTimes(1);
      },
    );
  });
});
