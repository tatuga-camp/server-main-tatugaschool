import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './cache.service';
import { TTL } from './cache-ttl';

// Immutable parent links (a record never moves subject or school), so no scopes.
export class CacheRefs {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  assignment(id: string) {
    return this.cache.getOrSet(`ref:assignment:${id}`, [], TTL.REF, () =>
      this.prisma.assignment.findUnique({
        where: { id },
        select: { subjectId: true, schoolId: true },
      }),
    );
  }

  subject(id: string) {
    return this.cache.getOrSet(`ref:subject:${id}`, [], TTL.REF, () =>
      this.prisma.subject.findUnique({
        where: { id },
        select: { schoolId: true },
      }),
    );
  }

  attendanceTable(id: string) {
    return this.cache.getOrSet(`ref:attendanceTable:${id}`, [], TTL.REF, () =>
      this.prisma.attendanceTable.findUnique({
        where: { id },
        select: { subjectId: true },
      }),
    );
  }

  submission(id: string) {
    return this.cache.getOrSet(`ref:submission:${id}`, [], TTL.REF, () =>
      this.prisma.studentOnAssignment.findUnique({
        where: { id },
        select: { subjectId: true, studentId: true },
      }),
    );
  }

  wordCloudSet(id: string) {
    return this.cache.getOrSet(`ref:wordCloudSet:${id}`, [], TTL.REF, () =>
      this.prisma.wordCloudSet.findUnique({
        where: { id },
        select: { subjectId: true },
      }),
    );
  }

  wordCloudToken(token: string): Promise<{ subjectId: string } | null> {
    // Same guard as WordCloudSetRepository.findSetByPublicResultsToken: a falsy
    // token must never match a set whose token was never issued.
    if (!token) return Promise.resolve(null);
    return this.cache.getOrSet(`ref:wordCloudToken:${token}`, [], TTL.SHORT, () =>
      this.prisma.wordCloudSet.findFirst({
        where: { publicResultsToken: token },
        select: { subjectId: true },
      }),
    );
  }
}
