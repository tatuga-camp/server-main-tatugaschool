import { ForbiddenException, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CommentAssignmentService } from './comment-assignment.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { createTestCache } from '../cache/testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  schoolMembersScope,
  subjectScope,
} from '../cache/cache-scopes';
import {
  REFUSED_TEACHERS,
  Row,
  Tables,
  accessRows,
  memoryPrisma,
} from '../cache/testing/memory-prisma';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// GET comment-assignments/studentOnAssignmentId/:id/{student,teacher}
// (submission comments, unit #11) over a real CacheService, the real cached
// ValidateAccess and an in-memory primary client.
const d = (day: number) => new Date(Date.UTC(2026, 9, day));

function seed(): Tables {
  const comment = (id: string, studentOnAssignmentId: string): Row => ({
    id,
    createAt: d(1),
    updateAt: d(2),
    content: `comment ${id}`,
    title: 'Mr',
    firstName: `F ${id}`,
    lastName: `L ${id}`,
    photo: null,
    blurHash: null,
    number: null,
    status: null,
    role: id === 'c1' ? 'TEACHER' : null,
    email: null,
    phone: null,
    subjectId: studentOnAssignmentId === 'y1' ? 's2' : 's1',
    schoolId: 'sch1',
    studentId: id === 'c1' ? null : 'st1',
    studentOnAssignmentId,
    teacherOnSubjectId: id === 'c1' ? 'tos1' : null,
    userId: id === 'c1' ? 'u1' : null,
  });
  return {
    ...accessRows(),
    subject: [
      { id: 's1', schoolId: 'sch1' },
      { id: 's2', schoolId: 'sch1' },
    ],
    studentOnAssignment: [
      { id: 'x1', subjectId: 's1', studentId: 'st1' },
      { id: 'x2', subjectId: 's1', studentId: 'st2' },
      { id: 'y1', subjectId: 's2', studentId: 'st9' },
    ],
    commentOnAssignment: [
      comment('c1', 'x1'),
      comment('c2', 'x1'),
      comment('c3', 'x2'),
      comment('c9', 'y1'),
    ],
  };
}

// The pre-cache read (commit 5cd3e62): commentAssignmentRepository.findMany
// with only a where clause, so no ordering or include to reproduce.
const legacyComments = (db: Tables, studentOnAssignmentId: string) =>
  db.commentOnAssignment.filter(
    (c) => c.studentOnAssignmentId === studentOnAssignmentId,
  );

async function setup() {
  const db = seed();
  const prisma = memoryPrisma(db);
  const { cache } = createTestCache();
  const module = await Test.createTestingModule({
    providers: [
      CommentAssignmentService,
      TeacherOnSubjectService,
      { provide: PrismaService, useValue: prisma },
      { provide: CacheService, useValue: cache },
    ],
  })
    .useMocker(() => ({}))
    .compile();
  const service = module.get(CommentAssignmentService);
  return {
    db,
    prisma,
    cache,
    asTeacher: (userId = 'u1', studentOnAssignmentId = 'x1') =>
      service.getByStudentOnAssignment(
        { studentOnAssignmentId },
        { id: userId } as any,
        null,
      ),
    asStudent: (studentId = 'st1', studentOnAssignmentId = 'x1') =>
      service.getByStudentOnAssignment({ studentOnAssignmentId }, null, {
        id: studentId,
      } as any),
  };
}

describe('CommentAssignmentService.getByStudentOnAssignment over the cache', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  it('returns the same JSON as before caching to the teacher and the owner, from one cache entry', async () => {
    const { db, prisma, asTeacher, asStudent } = await setup();
    const legacy = JSON.stringify(legacyComments(db, 'x1'));

    expect(JSON.stringify(await asTeacher())).toBe(legacy);
    expect(JSON.stringify(await asTeacher())).toBe(legacy);
    expect(JSON.stringify(await asStudent())).toBe(legacy);
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  describe('scopes', () => {
    const unrelated = [
      ...ALL_SUBJECT_SCOPE_KINDS.filter((k) => k !== 'submissions').map((k) =>
        subjectScope('s1', k),
      ),
      ...ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('s2', k)),
      schoolMembersScope('sch1'),
    ];

    it.each(unrelated)(
      'does not reload the comments after a bump of %s',
      async (scope) => {
        const { prisma, cache, asTeacher } = await setup();
        await asTeacher();
        await cache.bump(scope);

        await asTeacher();

        expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
      },
    );

    it('reloads the comments after a bump of its declared scope, submissions', async () => {
      const { db, prisma, cache, asTeacher } = await setup();
      await asTeacher();
      db.commentOnAssignment.push({ ...db.commentOnAssignment[0], id: 'c4' });
      await cache.bump(subjectScope('s1', 'submissions'));

      expect((await asTeacher()).map((c) => c.id)).toEqual(['c1', 'c2', 'c4']);
      expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(2);
    });
  });

  // Authorization runs before the cache on every request.
  it.each(REFUSED_TEACHERS)(
    'refuses a teacher %s, with the comments already cached',
    async (_why, userId, message) => {
      const { prisma, asTeacher, asStudent } = await setup();
      await asTeacher();
      await asStudent();

      await expect(asTeacher(userId)).rejects.toThrow(
        new ForbiddenException(message),
      );
      expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
    },
  );

  it("refuses a teacher of s1 the cached comments of another subject's submission", async () => {
    const { prisma, asTeacher } = await setup();
    await expect(asTeacher('u2', 'y1')).resolves.toHaveLength(1);

    await expect(asTeacher('u1', 'y1')).rejects.toThrow(ForbiddenException);
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('refuses a classmate the cached comments the teacher warmed', async () => {
    const { prisma, asTeacher, asStudent } = await setup();
    await asTeacher();

    await expect(asStudent('st2')).rejects.toThrow(
      new ForbiddenException("You don't have permission to access"),
    );
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });
});
