import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SubjectService } from './subject.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
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
  project,
} from '../cache/testing/memory-prisma';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// The roster reads (units #7 and #8) over a real CacheService, the real cached
// ValidateAccess and an in-memory primary client:
//   GET subjects/code/:code                (public)
//   GET subjects/student/subject/:id       (any signed-in student)
//   GET student-on-subjects/subject/:id    (teacher)
const d = (day: number) => new Date(Date.UTC(2026, 9, day));

function seed(): Tables {
  const subject = (id: string, code: string): Row => ({
    id,
    createAt: d(1),
    updateAt: d(2),
    title: `Subject ${id}`,
    code,
    allowHideStudentList: false,
    isDeleted: false,
    verifyLineToken: `secret-${id}`,
    schoolId: 'sch1',
  });
  const student = (id: string, subjectId: string, order: number): Row => ({
    id,
    createAt: d(order),
    updateAt: d(order),
    title: 'Mr',
    firstName: `F ${id}`,
    lastName: `L ${id}`,
    photo: `p ${id}`,
    number: String(order),
    isActive: true,
    order,
    studentId: id.replace('sos', 'st'),
    subjectId,
    schoolId: 'sch1',
  });
  return {
    ...accessRows(),
    subject: [subject('s1', 'abc123'), subject('s2', 'def456')],
    // Stored out of `order`, as a teacher's re-sorting leaves them.
    studentOnSubject: [
      student('sos3', 's1', 3),
      student('sos1', 's1', 1),
      student('sos2', 's1', 2),
      student('sos9', 's2', 1),
    ],
  };
}

// ── the pre-cache bodies (commit 5cd3e62) over the same rows ──────────────
function legacySubjectWithRoster(db: Tables, where: Row) {
  const row = db.subject.find((s) =>
    Object.entries(where).every(([key, value]) => s[key] === value),
  );
  if (!row) throw new NotFoundException('Subject not found');
  return {
    ...project(row, { omit: { verifyLineToken: true } }),
    // main nulls the public progress token on this unauthenticated route.
    publicProgressToken: null,
    studentOnSubjects: db.studentOnSubject.filter(
      (s) => s.subjectId === row.id,
    ),
    teacherOnSubjects: db.teacherOnSubject.filter(
      (t) => t.subjectId === row.id,
    ),
  };
}

const byOrder = (rows: Row[]) => [...rows].sort((a, b) => a.order - b.order);

function legacyStudentOnSubjects(db: Tables, subjectId: string) {
  return byOrder(db.studentOnSubject.filter((s) => s.subjectId === subjectId));
}

// The one change Task 14 makes on purpose: the subject endpoints now list the
// students by `order`, like the teacher roster. client-student sorts the list
// by `number` itself (pages/index.tsx), so it reads the same.
function expectedSubjectWithRoster(db: Tables, where: Row) {
  const legacy = legacySubjectWithRoster(db, where);
  return { ...legacy, studentOnSubjects: byOrder(legacy.studentOnSubjects) };
}

async function setup() {
  const db = seed();
  const prisma = memoryPrisma(db);
  const { cache } = createTestCache();
  const module = await Test.createTestingModule({
    providers: [
      SubjectService,
      StudentOnSubjectService,
      TeacherOnSubjectService,
      { provide: PrismaService, useValue: prisma },
      { provide: CacheService, useValue: cache },
    ],
  })
    .useMocker(() => ({}))
    .compile();
  const subjects = module.get(SubjectService);
  const students = module.get(StudentOnSubjectService);
  return {
    db,
    prisma,
    cache,
    byCode: (code = 'abc123') =>
      subjects.getSubjectWithTeacherAndStudent({ code }),
    byId: (subjectId = 's1') =>
      subjects.getSubjectWithTeacherAndStudent({ subjectId }),
    roster: (userId = 'u1', subjectId = 's1') =>
      students.getStudentOnSubjectsBySubjectId({ subjectId }, {
        id: userId,
      } as any),
  };
}

describe('roster reads over the cache', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  describe('GET subjects/code/:code', () => {
    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { db, prisma, byCode } = await setup();
      const expected = JSON.stringify(
        expectedSubjectWithRoster(db, { code: 'abc123' }),
      );

      const first = await byCode();
      const second = await byCode();

      expect(JSON.stringify(first)).toBe(expected);
      expect(JSON.stringify(second)).toBe(expected);
      expect(second).not.toHaveProperty('verifyLineToken');
      // The hit reads nothing: one code lookup and one roster read in total.
      expect(prisma.subject.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.teacherOnSubject.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns 404 for an unknown code, also on the second call', async () => {
      const { byCode } = await setup();

      for (let i = 0; i < 2; i++) {
        await expect(byCode('zzz999')).rejects.toThrow(
          new NotFoundException('Subject not found'),
        );
      }
    });
  });

  describe('GET subjects/student/subject/:id', () => {
    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { db, byId } = await setup();
      const expected = JSON.stringify(
        expectedSubjectWithRoster(db, { id: 's1' }),
      );

      expect(JSON.stringify(await byId())).toBe(expected);
      expect(JSON.stringify(await byId())).toBe(expected);
    });

    it('shares one cached roster with the code endpoint', async () => {
      const { prisma, byCode, byId } = await setup();

      expect(json(await byId())).toEqual(json(await byCode()));
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET student-on-subjects/subject/:id', () => {
    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { db, prisma, roster } = await setup();
      const legacy = JSON.stringify(legacyStudentOnSubjects(db, 's1'));

      expect(JSON.stringify(await roster())).toBe(legacy);
      expect(JSON.stringify(await roster())).toBe(legacy);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
    });

    it.each(REFUSED_TEACHERS)(
      'refuses a teacher %s, with the roster already cached',
      async (_why, userId, message) => {
        const { prisma, roster, byCode } = await setup();
        await roster();
        await byCode();

        await expect(roster(userId)).rejects.toThrow(
          new ForbiddenException(message),
        );
        expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
      },
    );

    it("refuses a teacher of s1 another subject's cached roster", async () => {
      const { prisma, roster } = await setup();
      await expect(roster('u2', 's2')).resolves.toHaveLength(1);

      await expect(roster('u1', 's2')).rejects.toThrow(ForbiddenException);
      expect(prisma.studentOnSubject.findMany).toHaveBeenCalledTimes(1);
    });

    it('serves the cached roster to a school admin', async () => {
      const { db, roster } = await setup();
      await roster();

      expect(json(await roster('u3'))).toEqual(
        json(legacyStudentOnSubjects(db, 's1')),
      );
    });

    it('refuses a teacher removed from the subject on their next request', async () => {
      const { db, cache, roster } = await setup();
      await roster();
      db.teacherOnSubject = db.teacherOnSubject.filter((t) => t.id !== 'tos1');
      // TeacherOnSubjectRepository.delete bumps the subject's roster.
      await cache.bump(subjectScope('s1', 'roster'));

      await expect(roster()).rejects.toThrow(
        new ForbiddenException("You're not a teacher on this subject"),
      );
    });
  });

  it('shows a new student on all three endpoints after the roster bump', async () => {
    const { db, cache, byCode, byId, roster } = await setup();
    await Promise.all([byCode(), byId(), roster()]);
    db.studentOnSubject.push({
      ...db.studentOnSubject[1],
      id: 'sos4',
      order: 4,
    });
    // StudentOnSubjectRepository writes bump the subject's roster.
    await cache.bump(subjectScope('s1', 'roster'));

    const ids = (rows: Row[]) => rows.map((s) => s.id);
    expect(ids((await byCode()).studentOnSubjects)).toEqual([
      'sos1',
      'sos2',
      'sos3',
      'sos4',
    ]);
    expect(ids((await byId()).studentOnSubjects)).toContain('sos4');
    expect(ids(await roster())).toContain('sos4');
  });
});
