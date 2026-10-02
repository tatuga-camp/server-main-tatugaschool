import { CacheRefs } from './cache-refs';
import { createTestCache } from './testing/cache-test-utils';

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
    return { prisma, refs };
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
});
