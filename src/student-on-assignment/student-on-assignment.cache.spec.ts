import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { createTestCache } from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';
import {
  REFUSED_TEACHERS,
  Row,
  Tables,
  accessRows,
  json,
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

// GET student-on-assignments/assignment/:id (teacher grading view, unit #6)
// over a real CacheService, the real cached ValidateAccess and an in-memory
// primary client.
const d = (day: number) => new Date(Date.UTC(2026, 9, day));

function submission(id: string, assignmentId: string, sos: string): Row {
  const status = { x1: 'REVIEWD', x2: 'SUBMITTED' }[id] ?? 'PENDDING';
  return {
    id,
    createAt: d(1),
    updateAt: d(2),
    title: 'Mr',
    firstName: `F ${sos}`,
    lastName: `L ${sos}`,
    photo: `p ${sos}`,
    blurHash: null,
    number: sos.slice(-1),
    score: status === 'REVIEWD' ? 8 : null,
    body: `answer ${id}`,
    completedAt: status === 'PENDDING' ? null : d(3),
    reviewdAt: status === 'REVIEWD' ? d(4) : null,
    isAssigned: true,
    status,
    studentId: sos.replace('sos', 'st'),
    assignmentId,
    studentOnSubjectId: sos,
    schoolId: 'sch1',
    subjectId: assignmentId === 'b1' ? 's2' : 's1',
  };
}

function seed(): Tables {
  const file = (id: string, studentOnAssignmentId: string): Row => ({
    id,
    createAt: d(3),
    updateAt: d(3),
    body: `${id}.pdf`,
    contentType: 'FILE',
    studentOnAssignmentId,
    assignmentId: studentOnAssignmentId === 'y1' ? 'b1' : 'a1',
  });
  return {
    ...accessRows(),
    subject: [
      { id: 's1', schoolId: 'sch1' },
      { id: 's2', schoolId: 'sch1' },
    ],
    assignment: [
      { id: 'a1', subjectId: 's1', type: 'Assignment' },
      { id: 'a2', subjectId: 's1', type: 'Assignment' },
      { id: 'b1', subjectId: 's2', type: 'Assignment' },
    ].map((a) => ({
      ...a,
      schoolId: 'sch1',
      vector: [0.1],
      vectorResouce: 'e',
    })),
    fileOnAssignment: [],
    questionOnVideo: [],
    studentOnAssignment: [
      submission('x1', 'a1', 'sos1'),
      submission('x2', 'a1', 'sos2'),
      submission('x3', 'a1', 'sos3'),
      submission('x4', 'a2', 'sos1'),
      submission('y1', 'b1', 'sos9'),
    ],
    fileOnStudentAssignment: [
      file('f1', 'x1'),
      file('f2', 'x1'),
      file('f3', 'x2'),
      file('f9', 'y1'),
    ],
  };
}

// The pre-cache body of getByAssignmentId (commit 5cd3e62) over the same rows.
function legacyGradingView(db: Tables, assignmentId: string) {
  const rows = db.studentOnAssignment.filter(
    (r) => r.assignmentId === assignmentId,
  );
  const ids = rows.map((r) => r.id);
  const files =
    rows.length > 0
      ? db.fileOnStudentAssignment.filter((f) =>
          ids.includes(f.studentOnAssignmentId),
        )
      : [];
  return rows.map((r) => ({
    ...r,
    files: files.filter((f) => f.studentOnAssignmentId === r.id),
  }));
}

async function setup() {
  const db = seed();
  const prisma = memoryPrisma(db);
  const { cache } = createTestCache();
  const module = await Test.createTestingModule({
    providers: [
      StudentOnAssignmentService,
      TeacherOnSubjectService,
      { provide: PrismaService, useValue: prisma },
      { provide: CacheService, useValue: cache },
    ],
  })
    .useMocker(() => ({}))
    .compile();
  const service = module.get(StudentOnAssignmentService);
  const view = (userId = 'u1', assignmentId = 'a1') =>
    service.getByAssignmentId({ assignmentId }, { id: userId } as any);
  return { db, prisma, cache, view };
}

describe('StudentOnAssignmentService.getByAssignmentId over the cache', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  it('returns the same JSON as before caching, on a miss and on a hit', async () => {
    const { db, prisma, view } = await setup();
    const legacy = JSON.stringify(legacyGradingView(db, 'a1'));

    const first = await view();
    const second = await view();

    // Byte for byte, key order included: what the client receives is unchanged.
    expect(JSON.stringify(first)).toBe(legacy);
    expect(JSON.stringify(second)).toBe(legacy);
    expect(second[0].createAt).toBeInstanceOf(Date);
    expect(second.map((s) => s.files.length)).toEqual([2, 1, 0]);
    // The hit reads nothing from the primary.
    expect(prisma.assignment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.assignment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.fileOnStudentAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('serves a new submission after the submissions bump its write makes', async () => {
    const { db, cache, view } = await setup();
    await view();
    db.studentOnAssignment.push(submission('x5', 'a1', 'sos5'));
    await cache.bump(subjectScope('s1', 'submissions'));

    expect(json(await view())).toEqual(json(legacyGradingView(db, 'a1')));
    expect((await view()).map((s) => s.id)).toContain('x5');
  });

  // Review Focus 1: the immutable ref outlives the assignment; the assignments
  // unit does not, so a deleted assignment is a 404 and never an empty list.
  it('returns 404 for a deleted assignment although its ref is still cached', async () => {
    const { db, prisma, cache, view } = await setup();
    await view();
    // AssignmentRepository.delete removes the assignment and its submissions,
    // then bumps the subject's assignments and submissions scopes.
    db.assignment = db.assignment.filter((a) => a.id !== 'a1');
    db.studentOnAssignment = db.studentOnAssignment.filter(
      (s) => s.assignmentId !== 'a1',
    );
    db.fileOnStudentAssignment = db.fileOnStudentAssignment.filter(
      (f) => f.assignmentId !== 'a1',
    );
    await cache.bump(
      subjectScope('s1', 'assignments'),
      subjectScope('s1', 'submissions'),
    );

    await expect(view()).rejects.toThrow(
      new NotFoundException('Assignment not found'),
    );
    await expect(view()).rejects.toThrow(NotFoundException);
    // The ref came from the cache: one lookup by id in total.
    expect(prisma.assignment.findUnique).toHaveBeenCalledTimes(1);
    // The assignments unit reloaded and no longer lists a1; the grading unit
    // was not reloaded, so nothing (stale or empty) was served for a1.
    expect(prisma.assignment.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for an unknown assignment id, also on the second call', async () => {
    const { prisma, view } = await setup();

    await expect(view('u1', 'nope')).rejects.toThrow(
      new NotFoundException('Assignment not found'),
    );
    await expect(view('u1', 'nope')).rejects.toThrow(NotFoundException);
    expect(prisma.assignment.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.studentOnAssignment.findMany).not.toHaveBeenCalled();
  });

  // Authorization runs before the cache on every request.
  it.each(REFUSED_TEACHERS)(
    'refuses a teacher %s, with the grading view already cached',
    async (_why, userId, message) => {
      const { prisma, view } = await setup();
      await view();

      await expect(view(userId)).rejects.toThrow(
        new ForbiddenException(message),
      );
      // A refusal is not cached: the next attempt is checked again.
      await expect(view(userId)).rejects.toThrow(ForbiddenException);
      expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(1);
    },
  );

  it("refuses a teacher of s1 the cached view of another subject's assignment", async () => {
    const { prisma, view } = await setup();
    // u2 teaches s2 and warms b1's grading view.
    await expect(view('u2', 'b1')).resolves.toHaveLength(1);

    await expect(view('u1', 'b1')).rejects.toThrow(
      new ForbiddenException("You're not a teacher on this subject"),
    );
    expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('serves the cached view to a school admin', async () => {
    const { db, prisma, view } = await setup();
    await view();

    expect(json(await view('u3'))).toEqual(json(legacyGradingView(db, 'a1')));
    expect(prisma.studentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('refuses a teacher removed from the subject on their next request', async () => {
    const { db, cache, view } = await setup();
    await view();
    db.teacherOnSubject = db.teacherOnSubject.filter((t) => t.id !== 'tos1');
    // TeacherOnSubjectRepository.delete bumps the subject's roster.
    await cache.bump(subjectScope('s1', 'roster'));

    await expect(view()).rejects.toThrow(
      new ForbiddenException("You're not a teacher on this subject"),
    );
  });
});
