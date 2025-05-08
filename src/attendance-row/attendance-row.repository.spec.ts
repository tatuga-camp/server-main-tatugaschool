import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceRowRepository } from './attendance-row.repository';

const prisma = new PrismaClient();

describe('AttendanceRowRepository', () => {
  let attendanceRowRepository: AttendanceRowRepository;
  const prismaService = new PrismaService();

  let subjectId = '660d16ef446ebda4dbd74f7e';
  let schoolId = '660d16ef446ebda4dbd74f7f';
  let attendanceTableId = '660d16ef446ebda4dbd74f88';
  let attendanceRowId: string;

  beforeEach(() => {
    attendanceRowRepository = new AttendanceRowRepository(prismaService);
  });

  describe('createAttendanceRow', () => {
    it('should create attendance row', async () => {
      try {
        const created = await attendanceRowRepository.createAttendanceRow({
          data: {
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            note: 'Initial note',
            type: 'SCAN',
            expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            allowScanAt: new Date().toISOString(),
            isAllowScanManyTime: true,
            attendanceTableId: attendanceTableId,
            subjectId: subjectId,
            schoolId: schoolId,
          },
        });

        expect(created).toBeDefined();
        expect(created.attendanceTableId).toBe(attendanceTableId);
        expect(created.type).toBe('SCAN');
        attendanceRowId = created.id;
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getAttendanceRowById', () => {
    it('should return row with attendances', async () => {
      try {
        const result = await attendanceRowRepository.getAttendanceRowById({
          attendanceRowId: attendanceRowId,
        });

        expect(result).toBeDefined();
        expect(result.id).toBe(attendanceRowId);
        expect(Array.isArray(result.attendances)).toBe(true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('updateAttendanceRow', () => {
    it('should update note and expireAt', async () => {
      try {
        const updated = await attendanceRowRepository.updateAttendanceRow({
          query: { attendanceRowId: attendanceRowId },
          body: {
            note: 'Updated note',
            startDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
          },
        });
  
        expect(updated.id).toBe(attendanceRowId);
        expect(updated.note).toBe('Updated note');
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });
  

  describe('findMany', () => {
    it('should return array of attendance rows', async () => {
      try {
        const rows = await attendanceRowRepository.findMany({
          where: {
            attendanceTableId: attendanceTableId,
          },
        });

        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].attendanceTableId).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getAttendanceRows', () => {
    it('should return rows by tableId', async () => {
      try {
        const rows = await attendanceRowRepository.getAttendanceRows({
          attendanceTableId: attendanceTableId,
        });

        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].attendanceTableId).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('deleteAttendanceRow', () => {
    it('should delete attendance row and return it', async () => {
      try {
        const deleted = await attendanceRowRepository.deleteAttendanceRow({
          attendanceRowId: attendanceRowId,
        });

        expect(deleted.id).toBe(attendanceRowId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });
});
