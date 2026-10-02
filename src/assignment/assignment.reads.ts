import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';
import { toSubmissionCounts } from './submission-counts';

export class AssignmentReads {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  subjectAssignments(subjectId: string) {
    return this.cache.getOrSet(
      `subjectAssignments:${subjectId}`,
      [subjectScope(subjectId, 'assignments')],
      TTL.LONG,
      async () => {
        const assignments = await this.prisma.assignment.findMany({
          where: { subjectId },
          omit: { vector: true, vectorResouce: true },
        });
        const ids = assignments.map((a) => a.id);
        const videoIds = assignments
          .filter((a) => a.type === 'VideoQuiz')
          .map((a) => a.id);
        const [files, questions] = await Promise.all([
          ids.length
            ? this.prisma.fileOnAssignment.findMany({
                where: { assignmentId: { in: ids } },
              })
            : [],
          videoIds.length
            ? this.prisma.questionOnVideo.findMany({
                where: { assignmentId: { in: videoIds } },
              })
            : [],
        ]);
        return { assignments, files, questions };
      },
    );
  }

  submissionCounts(subjectId: string) {
    return this.cache.getOrSet(
      `submissionCounts:${subjectId}`,
      [subjectScope(subjectId, 'submissions')],
      TTL.LONG,
      async () =>
        toSubmissionCounts(
          (await this.prisma.studentOnAssignment.groupBy({
            by: ['assignmentId', 'status', 'isAssigned'],
            where: { subjectId },
            _count: { _all: true },
          })) as any,
        ),
    );
  }

  studentSubmissions(subjectId: string, studentOnSubjectId: string) {
    return this.cache.getOrSet(
      `studentSubmissions:${studentOnSubjectId}`,
      [subjectScope(subjectId, 'submissions')],
      TTL.LONG,
      () =>
        this.prisma.studentOnAssignment.findMany({
          where: { subjectId, studentOnSubjectId },
        }),
    );
  }

  enrollment(subjectId: string, studentId: string) {
    return this.cache.getOrSet(
      `enrollment:${subjectId}:${studentId}`,
      [subjectScope(subjectId, 'roster')],
      TTL.LONG,
      () =>
        this.prisma.studentOnSubject.findFirst({
          where: { subjectId, studentId },
        }),
    );
  }
}
