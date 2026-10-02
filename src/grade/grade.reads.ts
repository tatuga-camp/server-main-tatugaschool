import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';

export class GradeReads {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  subjectGrades(subjectId: string) {
    return this.cache.getOrSet(
      `subjectGrades:${subjectId}`,
      [subjectScope(subjectId, 'grades')],
      TTL.LONG,
      async () => {
        const [grade, scoreOnSubjects] = await Promise.all([
          this.prisma.gradeRange.findUnique({ where: { subjectId } }),
          this.prisma.scoreOnSubject.findMany({ where: { subjectId } }),
        ]);
        return { grade, scoreOnSubjects };
      },
    );
  }
}
