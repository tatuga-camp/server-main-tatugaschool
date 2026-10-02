import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { AttendanceTableRepository } from '../../attendance-table/attendance-table.repository';
import { AttendanceRowRepository } from '../../attendance-row/attendance-row.repository';
import { AttendanceRepository } from '../../attendance/attendance.repository';
import { AttendanceStatusListSRepository } from '../../attendance-status-list/attendance-status-list.repository';

const record = {
  id: 'r1',
  subjectId: 's1',
  schoolId: 'sch1',
  attendanceTableId: 't1',
  attendanceRowId: 'r1',
  startDate: new Date(0),
  endDate: new Date(0),
};
const T = subjectScope('s1', 'attendance');

type Case = {
  name: string;
  run: (cache: any, prisma: any) => Promise<unknown>;
  scopes: string[];
};

const cases: Case[] = [
  {
    name: 'Table.create',
    run: (c, p) =>
      new AttendanceTableRepository(p, p, c).createAttendanceTable({} as any),
    scopes: [T],
  },
  {
    name: 'Table.update',
    run: (c, p) =>
      new AttendanceTableRepository(p, p, c).updateAttendanceTable({
        query: { attendanceTableId: 't1' },
        body: {},
      } as any),
    scopes: [T],
  },
  {
    name: 'Table.delete',
    run: (c, p) =>
      new AttendanceTableRepository(p, p, c).deleteAttendanceTable({
        attendanceTableId: 't1',
      }),
    scopes: [T],
  },
  {
    name: 'Row.create',
    run: (c, p) =>
      new AttendanceRowRepository(p, c).createAttendanceRow({
        data: {} as any,
      }),
    scopes: [T],
  },
  {
    name: 'Row.update',
    run: (c, p) =>
      new AttendanceRowRepository(p, c).updateAttendanceRow({
        query: { attendanceRowId: 'r1' },
        body: {},
      } as any),
    scopes: [T],
  },
  {
    name: 'Row.delete',
    run: (c, p) =>
      new AttendanceRowRepository(p, c).deleteAttendanceRow({
        attendanceRowId: 'r1',
      }),
    scopes: [T],
  },
  {
    name: 'Attendance.create',
    run: (c, p) =>
      new AttendanceRepository(p, p, c).create({ data: {} as any }),
    scopes: [T],
  },
  {
    name: 'Attendance.updateById',
    run: (c, p) =>
      new AttendanceRepository(p, p, c).updateAttendanceById({
        query: { attendanceId: 'r1' },
        body: {},
      } as any),
    scopes: [T],
  },
  {
    name: 'Status.create',
    run: (c, p) =>
      new AttendanceStatusListSRepository(p, c).create({ data: {} as any }),
    scopes: [T],
  },
  {
    name: 'Status.update',
    run: (c, p) =>
      new AttendanceStatusListSRepository(p, c).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [T],
  },
  {
    name: 'Status.delete',
    run: (c, p) =>
      new AttendanceStatusListSRepository(p, c).delete({
        where: { id: 'r1' },
      }),
    scopes: [T],
  },
  {
    name: 'Status.deleteMany',
    run: (c, p) =>
      new AttendanceStatusListSRepository(p, c).deleteMany(
        { where: { attendanceTableId: 't1' } },
        's1',
      ),
    scopes: [T],
  },
];

describe('attendance-scope repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    for (const scope of scopes) expect(cache.bump).toHaveBeenCalledWith(scope);
  });
});
