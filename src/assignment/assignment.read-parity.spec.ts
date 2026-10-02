// Response-shape parity for the cached read paths (rollout step 2).
// The service runs against an in-memory Prisma fake and a real CacheService;
// the `legacy*` functions restate the pre-cache code (commit 6581991) over the
// same tables. Both are compared after a JSON round trip, as the client sees them.
import { ForbiddenException } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { createTestCache } from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';
import {
  Row,
  fakePrisma,
  matches,
  project,
  seed,
} from './testing/read-parity.db';
import {
  CLIENT_OVERVIEW_STUDENT_FIELDS,
  json,
  legacyList,
  legacyStudentOverview,
  legacyTeacherOverview,
} from './testing/read-parity.legacy';

jest.mock('web-push', () => ({}));
jest.mock('googleapis', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

function setup() {
  const db = seed();
  const prisma = fakePrisma(db);
  const { cache } = createTestCache();
  const teacherOnSubjectService = { ValidateAccess: jest.fn() };
  const studentService = {
    studentRepository: {
      findById: jest.fn(async ({ studentId }: { studentId: string }) => ({
        id: studentId,
      })),
    },
  };
  const scoreOnStudentService = {
    scoreOnStudentRepository: {
      findMany: jest.fn(async (args: Row) =>
        db.scoreOnStudent.filter((r) => matches(r, args.where)),
      ),
    },
  };
  const none = {} as any;
  const service = new AssignmentService(
    prisma as any,
    none, // ai
    none, // storage
    teacherOnSubjectService as any,
    none, // subject
    none, // studentOnSubject
    none, // skill
    none, // skillOnAssignment
    none, // auth
    none, // grade
    none, // scoreOnSubject
    scoreOnStudentService as any,
    none, // videoQuiz repository
    studentService as any,
    none, // school
    none, // line bot
    none, // prisma read
    cache,
  );
  jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
  return { db, prisma, cache, service };
}

describe('AssignmentService read parity with the pre-cache code', () => {
  const teacher = { id: 'u1' } as any;
  const student = (id: string) => ({ id, schoolId: 'sch1' });

  describe('getAssignmentBySubjectId', () => {
    it('teacher: same keys, rows and counts as before', async () => {
      const { db, service } = setup();

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        teacher,
      );

      expect(json(result)).toEqual(json(legacyList(db, 's1')));
      expect(Object.keys(json(result)[0]).sort()).toEqual(
        Object.keys(json(legacyList(db, 's1'))[0]).sort(),
      );
      // a1: one REVIEWD + one SUBMITTED; a2: PENDDING counted only when assigned.
      const byId = Object.fromEntries(result.map((a) => [a.id, a]));
      expect(byId.a1).toMatchObject({
        studentAssign: 2,
        summitNumber: 1,
        penddingNumber: 0,
        reviewNumber: 1,
      });
      expect(byId.a2).toMatchObject({
        studentAssign: 2,
        summitNumber: 0,
        penddingNumber: 1,
        reviewNumber: 0,
      });
      expect(byId.a1).not.toHaveProperty('vector');
      expect(byId.a1).not.toHaveProperty('vectorResouce');
    });

    it('teacher: a cache hit returns the same JSON as the first call', async () => {
      const { service, prisma } = setup();

      const first = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        teacher,
      );
      const second = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        teacher,
      );

      expect(json(second)).toEqual(json(first));
      expect(prisma.assignment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.studentOnAssignment.groupBy).toHaveBeenCalledTimes(1);
    });

    it.each(['st1', 'st2'])(
      'student %s: same keys, rows, counts and studentOnAssignment as before',
      async (id) => {
        const { db, service } = setup();

        const result = await service.getAssignmentBySubjectId(
          { subjectId: 's1' },
          undefined,
          student(id),
        );

        expect(json(result)).toEqual(json(legacyList(db, 's1', id)));
        expect(result.length).toBeGreaterThan(0);
        for (const a of result) {
          expect(a.studentOnAssignment).toBeDefined();
          expect(a.studentOnAssignment!.studentId).toBe(id);
        }
      },
    );

    it('student: counts stay subject-wide, not per student', async () => {
      const { service } = setup();

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        undefined,
        student('st1'),
      );

      expect(result.find((a) => a.id === 'a1')).toMatchObject({
        studentAssign: 2,
        summitNumber: 1,
        reviewNumber: 1,
      });
    });
  });

  describe('getOverviewScoreOnAssignment (student)', () => {
    it.each(['st1', 'st2'])(
      'student %s: same response as before',
      async (id) => {
        const { db, service } = setup();

        const result = await service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: id },
          student(id),
        );

        expect(json(result)).toEqual(json(legacyStudentOverview(db, 's1', id)));
        expect(Object.keys(result).sort()).toEqual([
          'assignments',
          'grade',
          'scoreOnSubjects',
        ]);
        expect(Object.keys(result.assignments[0]).sort()).toEqual([
          'assignment',
          'studentOnAssignment',
        ]);
      },
    );
  });

  describe('getOverviewScoreOnAssignments (teacher)', () => {
    it('same response as before, students[] trimmed to the selected fields', async () => {
      const { db, service } = setup();

      const result = await service.getOverviewScoreOnAssignments(
        { subjectId: 's1' },
        teacher,
      );
      const legacy = legacyTeacherOverview(db, 's1');
      const keys = Object.keys(result.assignments[0].students[0]);

      expect(Object.keys(result).sort()).toEqual([
        'assignments',
        'grade',
        'scoreOnSubjects',
      ]);
      expect(Object.keys(result.assignments[0]).sort()).toEqual([
        'assignment',
        'students',
      ]);
      expect(json(result)).toEqual(
        json({
          ...legacy,
          assignments: legacy.assignments.map((a) => ({
            ...a,
            students: a.students.map((s) =>
              project(s, {
                select: Object.fromEntries(keys.map((k) => [k, true])),
              }),
            ),
          })),
        }),
      );
      // Same students per assignment as before (counts semantics).
      expect(result.assignments.map((a) => a.students.length)).toEqual(
        legacy.assignments.map((a) => a.students.length),
      );
    });

    it('still returns every students[] field the teacher client reads', async () => {
      const { service } = setup();

      const result = await service.getOverviewScoreOnAssignments(
        { subjectId: 's1' },
        teacher,
      );

      for (const entry of result.assignments) {
        for (const s of entry.students) {
          for (const field of CLIENT_OVERVIEW_STUDENT_FIELDS) {
            expect(s).toHaveProperty(field);
          }
          expect(s).not.toHaveProperty('body');
        }
      }
    });
  });

  // Review Focus 3: a cached `null` enrolment must still refuse the student.
  describe('not-enrolled student with a cached null enrolment', () => {
    it('getAssignmentBySubjectId refuses on the cached path too', async () => {
      const { db, prisma, cache, service } = setup();
      const call = () =>
        service.getAssignmentBySubjectId(
          { subjectId: 's1' },
          undefined,
          student('st3'),
        );

      await expect(call()).rejects.toThrow(ForbiddenException);
      await expect(call()).rejects.toThrow(ForbiddenException);
      expect(prisma.studentOnSubject.findFirst).toHaveBeenCalledTimes(1);

      // Enrolling (a roster write bumps the scope) lets the student in.
      db.studentOnSubject.push({
        id: 'sos3',
        subjectId: 's1',
        studentId: 'st3',
        isActive: true,
      });
      await cache.bump(subjectScope('s1', 'roster'));
      await expect(call()).resolves.toEqual([]);
    });

    it('getOverviewScoreOnAssignment refuses on the cached path too', async () => {
      const { prisma, service } = setup();
      const call = () =>
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st3' },
          student('st3'),
        );

      await expect(call()).rejects.toThrow(ForbiddenException);
      await expect(call()).rejects.toThrow(ForbiddenException);
      expect(prisma.studentOnSubject.findFirst).toHaveBeenCalledTimes(1);
    });

    it('a roster bump revokes a cached enrolment', async () => {
      const { db, cache, service } = setup();
      const call = () =>
        service.getAssignmentBySubjectId(
          { subjectId: 's1' },
          undefined,
          student('st1'),
        );

      await expect(call()).resolves.not.toEqual([]);
      db.studentOnSubject.splice(
        db.studentOnSubject.findIndex((s) => s.id === 'sos1'),
        1,
      );
      await cache.bump(subjectScope('s1', 'roster'));
      await expect(call()).rejects.toThrow(ForbiddenException);
    });
  });
});
