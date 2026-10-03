import { AttendanceReads } from './attendance.reads';
import { createTestCache } from '../cache/testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  SubjectScopeKind,
  schoolMembersScope,
  subjectScope,
} from '../cache/cache-scopes';

describe('AttendanceReads', () => {
  const createAt = new Date('2026-10-01T08:00:00.000Z');

  function setup() {
    const prisma = {
      attendanceTable: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 't1' }),
      },
      attendanceStatusList: { findMany: jest.fn().mockResolvedValue([]) },
      attendanceRow: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const { cache } = createTestCache();
    const reads = new AttendanceReads(prisma as any, cache);
    return { prisma, cache, reads };
  }

  describe('tables', () => {
    it('attaches each table its status lists and serves the second call from cache', async () => {
      const { prisma, reads } = setup();
      prisma.attendanceTable.findMany.mockResolvedValue([
        { id: 't1', subjectId: 's1', createAt },
        { id: 't2', subjectId: 's1', createAt },
      ]);
      prisma.attendanceStatusList.findMany.mockResolvedValue([
        { id: 'st1', attendanceTableId: 't1' },
        { id: 'st2', attendanceTableId: 't2' },
        { id: 'st3', attendanceTableId: 't1' },
      ]);

      const first = await reads.tables('s1');
      const second = await reads.tables('s1');

      // The cached copy has the same shape, with dates revived.
      expect(second).toEqual(first);
      expect(second[0].createAt).toBeInstanceOf(Date);
      expect(first).toEqual([
        {
          id: 't1',
          subjectId: 's1',
          createAt,
          statusLists: [
            { id: 'st1', attendanceTableId: 't1' },
            { id: 'st3', attendanceTableId: 't1' },
          ],
        },
        {
          id: 't2',
          subjectId: 's1',
          createAt,
          statusLists: [{ id: 'st2', attendanceTableId: 't2' }],
        },
      ]);
      expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceTable.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
      });
      expect(prisma.attendanceStatusList.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceStatusList.findMany).toHaveBeenCalledWith({
        where: { attendanceTableId: { in: ['t1', 't2'] } },
      });
    });

    it('skips the status-list read when the subject has no tables', async () => {
      const { prisma, reads } = setup();

      expect(await reads.tables('s1')).toEqual([]);
      expect(prisma.attendanceStatusList.findMany).not.toHaveBeenCalled();
    });

    it('reloads tables and status lists after an attendance bump', async () => {
      const { prisma, cache, reads } = setup();
      prisma.attendanceTable.findMany.mockResolvedValue([{ id: 't1' }]);

      await reads.tables('s1');
      await cache.bump(subjectScope('s1', 'attendance'));
      await reads.tables('s1');

      expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.attendanceStatusList.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('tableRows', () => {
    it('attaches each row its attendances and serves the second call from cache', async () => {
      const { prisma, reads } = setup();
      prisma.attendanceRow.findMany.mockResolvedValue([
        { id: 'r1', attendanceTableId: 't1', startDate: createAt },
        { id: 'r2', attendanceTableId: 't1', startDate: createAt },
      ]);
      prisma.attendance.findMany.mockResolvedValue([
        { id: 'a1', attendanceRowId: 'r1', studentOnSubjectId: 'sos1' },
        { id: 'a2', attendanceRowId: 'r1', studentOnSubjectId: 'sos2' },
      ]);

      const first = await reads.tableRows('s1', 't1');
      const second = await reads.tableRows('s1', 't1');

      expect(second).toEqual(first);
      expect(second[0].startDate).toBeInstanceOf(Date);
      expect(first).toEqual([
        {
          id: 'r1',
          attendanceTableId: 't1',
          startDate: createAt,
          attendances: [
            { id: 'a1', attendanceRowId: 'r1', studentOnSubjectId: 'sos1' },
            { id: 'a2', attendanceRowId: 'r1', studentOnSubjectId: 'sos2' },
          ],
        },
        {
          id: 'r2',
          attendanceTableId: 't1',
          startDate: createAt,
          attendances: [],
        },
      ]);
      expect(prisma.attendanceTable.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceTable.findUnique).toHaveBeenCalledWith({
        where: { id: 't1' },
        select: { id: true },
      });
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledWith({
        where: { attendanceTableId: 't1' },
      });
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendance.findMany).toHaveBeenCalledWith({
        where: { attendanceRowId: { in: ['r1', 'r2'] } },
      });
    });

    it('returns a cached null when the table no longer exists, without reading rows', async () => {
      const { prisma, reads } = setup();
      prisma.attendanceTable.findUnique.mockResolvedValue(null);

      expect(await reads.tableRows('s1', 't1')).toBeNull();
      expect(await reads.tableRows('s1', 't1')).toBeNull();
      expect(prisma.attendanceTable.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceRow.findMany).not.toHaveBeenCalled();
      expect(prisma.attendance.findMany).not.toHaveBeenCalled();
    });

    it('returns null after the attendance bump that deleted the table', async () => {
      const { prisma, cache, reads } = setup();

      expect(await reads.tableRows('s1', 't1')).toEqual([]);
      prisma.attendanceTable.findUnique.mockResolvedValue(null);
      await cache.bump(subjectScope('s1', 'attendance'));

      expect(await reads.tableRows('s1', 't1')).toBeNull();
    });

    it('skips the attendance read when the table has no rows', async () => {
      const { prisma, reads } = setup();

      expect(await reads.tableRows('s1', 't1')).toEqual([]);
      expect(prisma.attendance.findMany).not.toHaveBeenCalled();
    });

    it('reloads rows and attendances after an attendance bump', async () => {
      const { prisma, cache, reads } = setup();
      prisma.attendanceRow.findMany.mockResolvedValue([{ id: 'r1' }]);

      await reads.tableRows('s1', 't1');
      await cache.bump(subjectScope('s1', 'attendance'));
      await reads.tableRows('s1', 't1');

      expect(prisma.attendanceTable.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(2);
    });

    it('caches each table under its own key', async () => {
      const { prisma, reads } = setup();

      await reads.tableRows('s1', 't1');
      await reads.tableRows('s1', 't2');

      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.attendanceRow.findMany).toHaveBeenLastCalledWith({
        where: { attendanceTableId: 't2' },
      });
    });
  });

  describe('studentAttendance', () => {
    it("reads the subject's rows and only this student's attendance, then serves it from cache", async () => {
      const { prisma, reads } = setup();
      prisma.attendanceTable.findMany.mockResolvedValue([
        { id: 't1' },
        { id: 't2' },
      ]);
      prisma.attendanceRow.findMany.mockResolvedValue([
        { id: 'r1', attendanceTableId: 't1', startDate: createAt },
        { id: 'r2', attendanceTableId: 't2', startDate: createAt },
      ]);
      prisma.attendance.findMany.mockResolvedValue([
        { id: 'a1', attendanceTableId: 't1', studentOnSubjectId: 'sos1' },
      ]);

      const first = await reads.studentAttendance('s1', 'sos1');
      const second = await reads.studentAttendance('s1', 'sos1');

      expect(second).toEqual(first);
      expect(second.rows[0].startDate).toBeInstanceOf(Date);
      expect(first).toEqual({
        rows: [
          { id: 'r1', attendanceTableId: 't1', startDate: createAt },
          { id: 'r2', attendanceTableId: 't2', startDate: createAt },
        ],
        attendances: [
          { id: 'a1', attendanceTableId: 't1', studentOnSubjectId: 'sos1' },
        ],
      });
      expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceTable.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        select: { id: true },
      });
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledWith({
        where: { attendanceTableId: { in: ['t1', 't2'] } },
      });
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.attendance.findMany).toHaveBeenCalledWith({
        where: {
          attendanceTableId: { in: ['t1', 't2'] },
          studentOnSubjectId: 'sos1',
        },
      });
    });

    it('skips the row and attendance reads when the subject has no tables', async () => {
      const { prisma, reads } = setup();

      expect(await reads.studentAttendance('s1', 'sos1')).toEqual({
        rows: [],
        attendances: [],
      });
      expect(prisma.attendanceRow.findMany).not.toHaveBeenCalled();
      expect(prisma.attendance.findMany).not.toHaveBeenCalled();
    });

    it('caches each student under their own key', async () => {
      const { prisma, reads } = setup();
      prisma.attendanceTable.findMany.mockResolvedValue([{ id: 't1' }]);

      await reads.studentAttendance('s1', 'sos1');
      await reads.studentAttendance('s1', 'sos2');

      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.attendance.findMany).toHaveBeenLastCalledWith({
        where: {
          attendanceTableId: { in: ['t1'] },
          studentOnSubjectId: 'sos2',
        },
      });
    });

    it('reloads after an attendance bump', async () => {
      const { prisma, cache, reads } = setup();
      prisma.attendanceTable.findMany.mockResolvedValue([{ id: 't1' }]);

      await reads.studentAttendance('s1', 'sos1');
      await cache.bump(subjectScope('s1', 'attendance'));
      await reads.studentAttendance('s1', 'sos1');

      expect(prisma.attendanceTable.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.attendanceRow.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.attendance.findMany).toHaveBeenCalledTimes(2);
    });
  });

  // Each unit must reload only when one of its declared scopes moves.
  describe('no reload after an unrelated bump', () => {
    const units: {
      name: string;
      call: (r: AttendanceReads) => Promise<unknown>;
      mock: (p: any) => jest.Mock;
      declared: SubjectScopeKind[];
    }[] = [
      {
        name: 'tables',
        call: (r) => r.tables('s1'),
        mock: (p) => p.attendanceTable.findMany,
        declared: ['attendance'],
      },
      {
        name: 'tableRows',
        call: (r) => r.tableRows('s1', 't1'),
        mock: (p) => p.attendanceRow.findMany,
        declared: ['attendance'],
      },
      {
        name: 'studentAttendance',
        call: (r) => r.studentAttendance('s1', 'sos1'),
        mock: (p) => p.attendanceTable.findMany,
        declared: ['attendance'],
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
