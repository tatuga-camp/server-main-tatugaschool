import { AssignmentReads } from './assignment.reads';
import { createTestCache } from '../cache/testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  SubjectScopeKind,
  schoolMembersScope,
  subjectScope,
} from '../cache/cache-scopes';

describe('AssignmentReads', () => {
  function setup() {
    const prisma = {
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      fileOnAssignment: { findMany: jest.fn().mockResolvedValue([]) },
      questionOnVideo: { findMany: jest.fn().mockResolvedValue([]) },
      studentOnAssignment: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentOnSubject: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const { cache } = createTestCache();
    const reads = new AssignmentReads(prisma as any, cache);
    return { prisma, cache, reads };
  }

  describe('subjectAssignments', () => {
    it('reads Prisma once across two calls, omitting the embedding', async () => {
      const { prisma, reads } = setup();
      prisma.assignment.findMany.mockResolvedValue([
        { id: 'a1', type: 'VideoQuiz' },
        { id: 'a2', type: 'Assignment' },
      ]);
      prisma.fileOnAssignment.findMany.mockResolvedValue([
        { id: 'f1', assignmentId: 'a2' },
      ]);
      prisma.questionOnVideo.findMany.mockResolvedValue([
        { id: 'q1', assignmentId: 'a1' },
      ]);

      const first = await reads.subjectAssignments('s1');
      const second = await reads.subjectAssignments('s1');

      expect(second).toEqual(first);
      expect(first.files).toEqual([{ id: 'f1', assignmentId: 'a2' }]);
      expect(first.questions).toEqual([{ id: 'q1', assignmentId: 'a1' }]);
      expect(prisma.assignment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.assignment.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        omit: { vector: true, vectorResouce: true },
      });
      expect(prisma.questionOnVideo.findMany).toHaveBeenCalledWith({
        where: { assignmentId: { in: ['a1'] } },
      });
    });

    it('skips file and question reads when the subject has no assignments', async () => {
      const { prisma, reads } = setup();

      expect(await reads.subjectAssignments('s1')).toEqual({
        assignments: [],
        files: [],
        questions: [],
      });
      expect(prisma.fileOnAssignment.findMany).not.toHaveBeenCalled();
      expect(prisma.questionOnVideo.findMany).not.toHaveBeenCalled();
    });

    it('reloads after an assignments bump', async () => {
      const { prisma, cache, reads } = setup();

      await reads.subjectAssignments('s1');
      await cache.bump(subjectScope('s1', 'assignments'));
      await reads.subjectAssignments('s1');

      expect(prisma.assignment.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('submissionCounts', () => {
    it('groups by assignment, status and isAssigned and caches the counts', async () => {
      const { prisma, reads } = setup();
      prisma.studentOnAssignment.groupBy.mockResolvedValue([
        {
          assignmentId: 'a1',
          status: 'SUBMITTED',
          isAssigned: true,
          _count: { _all: 2 },
        },
      ]);

      const first = await reads.submissionCounts('s1');
      await reads.submissionCounts('s1');

      expect(first.a1).toEqual({
        studentAssign: 2,
        summitNumber: 2,
        penddingNumber: 0,
        reviewNumber: 0,
      });
      expect(prisma.studentOnAssignment.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnAssignment.groupBy).toHaveBeenCalledWith({
        by: ['assignmentId', 'status', 'isAssigned'],
        where: { subjectId: 's1' },
        _count: { _all: true },
      });
    });

    it('reloads after a submissions bump', async () => {
      const { prisma, cache, reads } = setup();

      await reads.submissionCounts('s1');
      await cache.bump(subjectScope('s1', 'submissions'));
      await reads.submissionCounts('s1');

      expect(prisma.studentOnAssignment.groupBy).toHaveBeenCalledTimes(2);
    });
  });

  describe('studentSubmissions', () => {
    it('caches per student and reloads after a submissions bump', async () => {
      const { prisma, cache, reads } = setup();

      await reads.studentSubmissions('s1', 'sos1');
      await reads.studentSubmissions('s1', 'sos1');
      expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1', studentOnSubjectId: 'sos1' },
      });

      await cache.bump(subjectScope('s1', 'submissions'));
      await reads.studentSubmissions('s1', 'sos1');
      expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('enrollment', () => {
    it('returns a cached null', async () => {
      const { prisma, reads } = setup();

      expect(await reads.enrollment('s1', 'st1')).toBeNull();
      expect(await reads.enrollment('s1', 'st1')).toBeNull();
      expect(prisma.studentOnSubject.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnSubject.findFirst).toHaveBeenCalledWith({
        where: { subjectId: 's1', studentId: 'st1' },
      });
    });

    it('reloads after a roster bump', async () => {
      const { prisma, cache, reads } = setup();

      await reads.enrollment('s1', 'st1');
      await cache.bump(subjectScope('s1', 'roster'));
      await reads.enrollment('s1', 'st1');

      expect(prisma.studentOnSubject.findFirst).toHaveBeenCalledTimes(2);
    });

    it('serves a found enrolment from cache on the second call', async () => {
      const { prisma, reads } = setup();
      prisma.studentOnSubject.findFirst.mockResolvedValue({
        id: 'sos1',
        subjectId: 's1',
        studentId: 'st1',
      });

      const first = await reads.enrollment('s1', 'st1');
      const second = await reads.enrollment('s1', 'st1');

      expect(second).toEqual(first);
      expect(first).toEqual({ id: 'sos1', subjectId: 's1', studentId: 'st1' });
      expect(prisma.studentOnSubject.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('subjectAssignments second call', () => {
    it('does not re-read files or questions', async () => {
      const { prisma, reads } = setup();
      prisma.assignment.findMany.mockResolvedValue([
        { id: 'a1', type: 'VideoQuiz' },
      ]);

      await reads.subjectAssignments('s1');
      await reads.subjectAssignments('s1');

      expect(prisma.fileOnAssignment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.questionOnVideo.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // Each unit must reload only when one of its declared scopes moves.
  describe('no reload after an unrelated bump', () => {
    const units: {
      name: string;
      call: (r: AssignmentReads) => Promise<unknown>;
      mock: (p: any) => jest.Mock;
      declared: SubjectScopeKind[];
    }[] = [
      {
        name: 'subjectAssignments',
        call: (r) => r.subjectAssignments('s1'),
        mock: (p) => p.assignment.findMany,
        declared: ['assignments'],
      },
      {
        name: 'submissionCounts',
        call: (r) => r.submissionCounts('s1'),
        mock: (p) => p.studentOnAssignment.groupBy,
        declared: ['submissions'],
      },
      {
        name: 'studentSubmissions',
        call: (r) => r.studentSubmissions('s1', 'sos1'),
        mock: (p) => p.studentOnAssignment.findMany,
        declared: ['submissions'],
      },
      {
        name: 'enrollment',
        call: (r) => r.enrollment('s1', 'st1'),
        mock: (p) => p.studentOnSubject.findFirst,
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
