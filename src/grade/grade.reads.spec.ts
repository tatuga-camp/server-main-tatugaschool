import { GradeReads } from './grade.reads';
import { createTestCache } from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';

describe('GradeReads', () => {
  function setup() {
    const prisma = {
      gradeRange: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'g1', subjectId: 's1', gradeRules: '[]' }),
      },
      scoreOnSubject: {
        findMany: jest.fn().mockResolvedValue([{ id: 'sc1', subjectId: 's1' }]),
      },
    };
    const { cache } = createTestCache();
    const reads = new GradeReads(prisma as any, cache);
    return { prisma, cache, reads };
  }

  describe('subjectGrades', () => {
    it('reads Prisma once across two calls', async () => {
      const { prisma, reads } = setup();

      const first = await reads.subjectGrades('s1');
      const second = await reads.subjectGrades('s1');

      expect(second).toEqual(first);
      expect(first).toEqual({
        grade: { id: 'g1', subjectId: 's1', gradeRules: '[]' },
        scoreOnSubjects: [{ id: 'sc1', subjectId: 's1' }],
      });
      expect(prisma.gradeRange.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.gradeRange.findUnique).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
      });
      expect(prisma.scoreOnSubject.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.scoreOnSubject.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
      });
    });

    it('caches a missing grade range as null', async () => {
      const { prisma, reads } = setup();
      prisma.gradeRange.findUnique.mockResolvedValue(null);

      expect((await reads.subjectGrades('s1')).grade).toBeNull();
      expect((await reads.subjectGrades('s1')).grade).toBeNull();
      expect(prisma.gradeRange.findUnique).toHaveBeenCalledTimes(1);
    });

    it('reloads after a grades bump', async () => {
      const { prisma, cache, reads } = setup();

      await reads.subjectGrades('s1');
      await cache.bump(subjectScope('s1', 'grades'));
      await reads.subjectGrades('s1');

      expect(prisma.gradeRange.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.scoreOnSubject.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
