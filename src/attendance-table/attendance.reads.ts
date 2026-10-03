import {
  Attendance,
  AttendanceRow,
  AttendanceStatusList,
  AttendanceTable,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';

// Attendance views (unit #9). Callers authorize first and pass the subjectId
// from CacheRefs (or the checked route param), so each scope is the right one.
export class AttendanceReads {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  tables(
    subjectId: string,
  ): Promise<(AttendanceTable & { statusLists: AttendanceStatusList[] })[]> {
    return this.cache.getOrSet(
      `attendanceTables:${subjectId}`,
      [subjectScope(subjectId, 'attendance')],
      TTL.SHORT,
      async () => {
        const tables = await this.prisma.attendanceTable.findMany({
          where: { subjectId },
        });
        const statusLists =
          tables.length > 0
            ? await this.prisma.attendanceStatusList.findMany({
                where: {
                  attendanceTableId: { in: tables.map((table) => table.id) },
                },
              })
            : [];
        return tables.map((table) => ({
          ...table,
          statusLists: statusLists.filter(
            (status) => status.attendanceTableId === table.id,
          ),
        }));
      },
    );
  }

  // null when the table is gone: its immutable ref outlives it, this unit does not.
  tableRows(
    subjectId: string,
    tableId: string,
  ): Promise<(AttendanceRow & { attendances: Attendance[] })[] | null> {
    return this.cache.getOrSet(
      `attendanceTableRows:${tableId}`,
      [subjectScope(subjectId, 'attendance')],
      TTL.SHORT,
      async () => {
        const table = await this.prisma.attendanceTable.findUnique({
          where: { id: tableId },
          select: { id: true },
        });
        if (!table) return null;
        const rows = await this.prisma.attendanceRow.findMany({
          where: { attendanceTableId: tableId },
        });
        const attendances =
          rows.length > 0
            ? await this.prisma.attendance.findMany({
                where: { attendanceRowId: { in: rows.map((row) => row.id) } },
              })
            : [];
        return rows.map((row) => ({
          ...row,
          attendances: attendances.filter(
            (attendance) => attendance.attendanceRowId === row.id,
          ),
        }));
      },
    );
  }

  // Cached per student, so a cached value never holds other students' attendance.
  studentAttendance(
    subjectId: string,
    studentOnSubjectId: string,
  ): Promise<{ rows: AttendanceRow[]; attendances: Attendance[] }> {
    return this.cache.getOrSet(
      `studentAttendance:${studentOnSubjectId}`,
      [subjectScope(subjectId, 'attendance')],
      TTL.SHORT,
      async () => {
        const tables = await this.prisma.attendanceTable.findMany({
          where: { subjectId },
          select: { id: true },
        });
        if (tables.length === 0) return { rows: [], attendances: [] };
        const tableIds = tables.map((table) => table.id);
        const [rows, attendances] = await Promise.all([
          this.prisma.attendanceRow.findMany({
            where: { attendanceTableId: { in: tableIds } },
          }),
          this.prisma.attendance.findMany({
            where: { attendanceTableId: { in: tableIds }, studentOnSubjectId },
          }),
        ]);
        return { rows, attendances };
      },
    );
  }
}
