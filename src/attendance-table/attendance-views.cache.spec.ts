import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AttendanceTableService } from './attendance-table.service';
import { AttendanceRowService } from '../attendance-row/attendance-row.service';
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

// The attendance polls (unit #9) over a real CacheService, the real cached
// ValidateAccess and an in-memory primary client:
//   GET attendance-rows/attendance-table/:id                 (teacher)
//   GET attendance-tables/subject/:id                        (teacher)
//   GET attendance-tables/student/:studentId/subject/:id     (student)
const d = (day: number) => new Date(Date.UTC(2026, 9, day));
const subjectOf = (tableId: string) => (tableId === 't9' ? 's2' : 's1');

function seed(): Tables {
  const base = (id: string, day: number) => ({
    id,
    createAt: d(day),
    updateAt: d(day),
  });
  const table = (id: string): Row => ({
    ...base(id, 1),
    title: `Table ${id}`,
    description: null,
    subjectId: subjectOf(id),
    schoolId: 'sch1',
  });
  const status = (id: string, tableId: string, title: string): Row => ({
    ...base(id, 1),
    title,
    value: title === 'Present' ? 1 : 0,
    color: '#00ff00',
    isHidden: false,
    attendanceTableId: tableId,
    schoolId: 'sch1',
    subjectId: subjectOf(tableId),
  });
  const row = (id: string, tableId: string, day: number): Row => ({
    ...base(id, day),
    startDate: d(day),
    endDate: d(day + 1),
    note: null,
    expireAt: null,
    allowScanAt: null,
    isAllowScanManyTime: null,
    type: 'NORMAL',
    attendanceTableId: tableId,
    subjectId: subjectOf(tableId),
    schoolId: 'sch1',
  });
  const mark = (rowId: string, tableId: string, sos: string): Row => ({
    ...base(`${rowId}-${sos}`, 5),
    startDate: d(5),
    endDate: d(6),
    status: 'PRESENT',
    note: null,
    attendanceTableId: tableId,
    studentId: sos.replace('sos', 'st'),
    attendanceRowId: rowId,
    studentOnSubjectId: sos,
    schoolId: 'sch1',
    subjectId: subjectOf(tableId),
  });
  return {
    ...accessRows(),
    subject: [
      { id: 's1', schoolId: 'sch1' },
      { id: 's2', schoolId: 'sch1' },
    ],
    studentOnSubject: [
      { id: 'sos1', subjectId: 's1', studentId: 'st1' },
      { id: 'sos2', subjectId: 's1', studentId: 'st2' },
      { id: 'sos9', subjectId: 's2', studentId: 'st9' },
    ],
    attendanceTable: [table('t1'), table('t2'), table('t9')],
    attendanceStatusList: [
      status('l1', 't1', 'Present'),
      status('l2', 't1', 'Absent'),
      status('l3', 't2', 'Present'),
      status('l9', 't9', 'Present'),
    ],
    attendanceRow: [
      row('r1', 't1', 1),
      row('r2', 't1', 2),
      row('r3', 't2', 3),
      row('r9', 't9', 4),
    ],
    attendance: [
      mark('r1', 't1', 'sos1'),
      mark('r1', 't1', 'sos2'),
      mark('r2', 't1', 'sos1'),
      mark('r3', 't2', 'sos2'),
      mark('r9', 't9', 'sos9'),
    ],
  };
}

// ── the pre-cache bodies (commit 5cd3e62) over the same rows ──────────────
const byTable = (rows: Row[], id: string) =>
  rows.filter((r) => r.attendanceTableId === id);

function legacyTableRows(db: Tables, tableId: string) {
  const rows = byTable(db.attendanceRow, tableId);
  const ids = rows.map((r) => r.id);
  const attendances =
    rows.length > 0
      ? db.attendance.filter((a) => ids.includes(a.attendanceRowId))
      : [];
  return rows.map((row) => ({
    ...row,
    attendances: attendances.filter((a) => a.attendanceRowId === row.id),
  }));
}

function legacySubjectTables(db: Tables, subjectId: string) {
  const tables = db.attendanceTable.filter((t) => t.subjectId === subjectId);
  return tables.map((table) => ({
    ...table,
    statusLists: byTable(db.attendanceStatusList, table.id),
  }));
}

function legacyStudentView(db: Tables, subjectId: string, studentId: string) {
  const sos = db.studentOnSubject.find(
    (s) => s.subjectId === subjectId && s.studentId === studentId,
  );
  const tables = db.attendanceTable.filter((t) => t.subjectId === subjectId);
  return tables.map((table) => ({
    ...table,
    rows: byTable(db.attendanceRow, table.id),
    attendances: byTable(db.attendance, table.id).filter(
      (a) => a.studentOnSubjectId === sos.id,
    ),
    statusLists: byTable(db.attendanceStatusList, table.id),
  }));
}

async function setup() {
  const db = seed();
  const prisma = memoryPrisma(db);
  const { cache } = createTestCache();
  const module = await Test.createTestingModule({
    providers: [
      AttendanceRowService,
      AttendanceTableService,
      TeacherOnSubjectService,
      { provide: PrismaService, useValue: prisma },
      { provide: CacheService, useValue: cache },
    ],
  })
    .useMocker(() => ({}))
    .compile();
  const rowService = module.get(AttendanceRowService);
  const tableService = module.get(AttendanceTableService);
  return {
    db,
    prisma,
    cache,
    tableRows: (userId = 'u1', attendanceTableId = 't1') =>
      rowService.GetAttendanceRows(
        { attendanceTableId } as any,
        {
          id: userId,
        } as any,
      ),
    subjectTables: (userId = 'u1', subjectId = 's1') =>
      tableService.getBySubjectId({ subjectId } as any, { id: userId } as any),
    studentView: (studentId = 'st1', caller = studentId, subjectId = 's1') =>
      tableService.getBySubjectIdOnStudentOnSubject({ subjectId, studentId }, {
        id: caller,
      } as any),
  };
}

describe('attendance views over the cache', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  describe('GET attendance-rows/attendance-table/:id', () => {
    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { db, prisma, tableRows } = await setup();
      const legacy = JSON.stringify(legacyTableRows(db, 't1'));

      expect(JSON.stringify(await tableRows())).toBe(legacy);
      expect(JSON.stringify(await tableRows())).toBe(legacy);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns 404 for a deleted table although its ref is still cached', async () => {
      const { db, prisma, cache, tableRows } = await setup();
      await tableRows();
      // AttendanceTableRepository.deleteAttendanceTable bumps attendance.
      db.attendanceTable = db.attendanceTable.filter((t) => t.id !== 't1');
      db.attendanceRow = db.attendanceRow.filter(
        (r) => r.attendanceTableId !== 't1',
      );
      await cache.bump(subjectScope('s1', 'attendance'));

      await expect(tableRows()).rejects.toThrow(
        new NotFoundException('Attendance table not found'),
      );
      // The ref came from the cache: one lookup of the table's subject in total.
      const refLookups = prisma.attendanceTable.findUnique.mock.calls.filter(
        ([args]) => args.select.subjectId,
      );
      expect(refLookups).toHaveLength(1);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(1);
    });

    it.each(REFUSED_TEACHERS)(
      'refuses a teacher %s, with the rows already cached',
      async (_why, userId, message) => {
        const { prisma, tableRows } = await setup();
        await tableRows();

        await expect(tableRows(userId)).rejects.toThrow(
          new ForbiddenException(message),
        );
        expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(1);
      },
    );

    it("refuses a teacher of s1 the cached rows of another subject's table", async () => {
      const { prisma, tableRows } = await setup();
      await expect(tableRows('u2', 't9')).resolves.toHaveLength(1);

      await expect(tableRows('u1', 't9')).rejects.toThrow(ForbiddenException);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(1);
    });

    it('serves the cached rows to a school admin', async () => {
      const { db, tableRows } = await setup();
      await tableRows();

      expect(json(await tableRows('u3'))).toEqual(
        json(legacyTableRows(db, 't1')),
      );
    });
  });

  describe('GET attendance-tables/subject/:id', () => {
    it('returns the same JSON as before caching, on a miss and on a hit', async () => {
      const { db, prisma, subjectTables } = await setup();
      const legacy = JSON.stringify(legacySubjectTables(db, 's1'));

      expect(JSON.stringify(await subjectTables())).toBe(legacy);
      expect(JSON.stringify(await subjectTables())).toBe(legacy);
      expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceStatusList.findMany).toHaveBeenCalledTimes(1);
    });

    it('returns 404 for an unknown subject', async () => {
      const { subjectTables } = await setup();

      await expect(subjectTables('u1', 'nope')).rejects.toThrow(
        new NotFoundException('Subject not found'),
      );
    });

    it.each(REFUSED_TEACHERS)(
      'refuses a teacher %s, with the tables already cached',
      async (_why, userId, message) => {
        const { prisma, subjectTables } = await setup();
        await subjectTables();

        await expect(subjectTables(userId)).rejects.toThrow(
          new ForbiddenException(message),
        );
        expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(1);
      },
    );

    it("refuses a teacher of s1 another subject's cached tables", async () => {
      const { prisma, subjectTables } = await setup();
      await expect(subjectTables('u2', 's2')).resolves.toHaveLength(1);

      await expect(subjectTables('u1', 's2')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET attendance-tables/student/:studentId/subject/:id', () => {
    it.each(['st1', 'st2'])(
      'returns %s the same JSON as before caching, on a miss and on a hit',
      async (studentId) => {
        const { db, studentView } = await setup();
        const legacy = JSON.stringify(legacyStudentView(db, 's1', studentId));

        expect(JSON.stringify(await studentView(studentId))).toBe(legacy);
        expect(JSON.stringify(await studentView(studentId))).toBe(legacy);
      },
    );

    it("never serves one student's cached attendance to another", async () => {
      const { db, prisma, studentView } = await setup();
      await studentView('st1');

      const result = await studentView('st2');

      expect(JSON.stringify(result)).toBe(
        JSON.stringify(legacyStudentView(db, 's1', 'st2')),
      );
      const ownerOf = result.flatMap((t) =>
        t.attendances.map((a) => a.studentOnSubjectId),
      );
      expect(new Set(ownerOf)).toEqual(new Set(['sos2']));
      // The tables are shared; each student's attendance is read once.
      expect(prisma.attendanceStatusList.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(2);
    });

    it("refuses a student asking for another student's view, with it cached", async () => {
      const { prisma, studentView } = await setup();
      await studentView('st1');

      await expect(studentView('st1', 'st2')).rejects.toThrow(
        new ForbiddenException("You don't have access to this student"),
      );
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['not enrolled anywhere', 'st3'],
      ['enrolled only in s2', 'st9'],
    ])(
      'refuses a student %s on every request, with s1 cached',
      async (_why, studentId) => {
        const { prisma, studentView } = await setup();
        await studentView('st1');

        for (let i = 0; i < 2; i++) {
          await expect(studentView(studentId)).rejects.toThrow(
            new ForbiddenException('Student not found'),
          );
        }
        // The null enrolment is cached, and still refused.
        expect(
          prisma.studentOnSubject.findFirst.mock.calls.filter(
            ([args]) => args.where.studentId === studentId,
          ),
        ).toHaveLength(1);
        expect(prisma.attendance.findMany).toHaveBeenCalledTimes(1);
      },
    );

    it('refuses a student removed from the subject on their next request', async () => {
      const { db, cache, studentView } = await setup();
      await studentView('st1');
      db.studentOnSubject = db.studentOnSubject.filter((s) => s.id !== 'sos1');
      // StudentOnSubjectRepository.delete bumps the subject's roster.
      await cache.bump(subjectScope('s1', 'roster'));

      await expect(studentView('st1')).rejects.toThrow(
        new ForbiddenException('Student not found'),
      );
    });
  });
});
