import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';

// Subject roster (unit #7) and code lookup (unit #8). Callers authorize first
// where the endpoint requires it; these loaders read the primary client.
export class SubjectReads {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // null when the subject does not exist. verifyLineToken never enters the
  // cache, because the code endpoint serving this roster is public.
  subjectRoster(subjectId: string) {
    return this.cache.getOrSet(
      `subjectRoster:${subjectId}`,
      [subjectScope(subjectId, 'roster')],
      TTL.LONG,
      async () => {
        const subject = await this.prisma.subject.findUnique({
          where: { id: subjectId },
          omit: { verifyLineToken: true, publicProgressToken: true },
        });
        if (!subject) return null;
        const [students, teachers] = await Promise.all([
          this.prisma.studentOnSubject.findMany({
            where: { subjectId },
            orderBy: { order: 'asc' },
          }),
          this.prisma.teacherOnSubject.findMany({ where: { subjectId } }),
        ]);
        return { subject, students, teachers };
      },
    );
  }

  // No scopes: the mapping is self-checking (spec §6.1). The caller compares
  // the roster's code with the requested one and calls forgetCode on mismatch.
  subjectIdByCode(code: string) {
    return this.cache.getOrSet(
      `subjectCode:${code}`,
      [],
      TTL.SHORT,
      async () =>
        (
          await this.prisma.subject.findUnique({
            where: { code },
            select: { id: true },
          })
        )?.id ?? null,
    );
  }

  forgetCode(code: string) {
    return this.cache.del(`subjectCode:${code}`);
  }
}
