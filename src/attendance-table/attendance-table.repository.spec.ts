import { PrismaService } from '../prisma/prisma.service';
import { AttendanceTableRepository } from './attendance-table.repository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AttendanceTableRepository', () => {
  let attendanceTableRepository: AttendanceTableRepository;
  const prismaService = new PrismaService();

  const subjectId = 'bcf4d87416d1469b94b8a131';
  const schoolId = '526e3dfdbd6f4d86a5d0406f';
  let attendanceTableId: string;

  beforeEach(() => {
    attendanceTableRepository = new AttendanceTableRepository(prismaService);
  });

  describe('createAttendanceTable', () => {
    it('should create attendance table', async () => {
      try {
        const created = await attendanceTableRepository.createAttendanceTable({
          title: 'Test Attendance Table',
          description: 'First week attendance',
          subjectId: subjectId,
          schoolId: schoolId,
        });

        expect(created.title).toBe('Test Attendance Table');
        expect(created.description).toBe('First week attendance');
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);
        attendanceTableId = created.id;
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getAttendanceTables', () => {
    it('should get tables by subjectId', async () => {
      try {
        const tables = await attendanceTableRepository.getAttendanceTables({
          subjectId: subjectId,
        });

        expect(Array.isArray(tables)).toBe(true);
        expect(tables.length).toBeGreaterThan(0);
        expect(tables[0].subjectId).toBe(subjectId);
        expect(tables[0].id).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return tables from findMany', async () => {
      try {
        const tables = await attendanceTableRepository.findMany({
          where: {
            subjectId: subjectId,
          },
        });

        expect(tables.length).toBeGreaterThan(0);

        expect(tables[0].subjectId).toBe(subjectId);
        expect(tables[0].id).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getAttendanceTableById', () => {
    it('should return table by id with rows and students', async () => {
      try {
        const result = await attendanceTableRepository.getAttendanceTableById({
          attendanceTableId: attendanceTableId,
        });

        expect(result.id).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('updateAttendanceTable', () => {
    it('should update title and description', async () => {
      try {
        const updated = await attendanceTableRepository.updateAttendanceTable({
          query: {
            attendanceTableId: attendanceTableId,
          },
          body: {
            title: 'Updated Title',
            description: 'Updated Desc',
          },
        });

        expect(updated.id).toBe(attendanceTableId);
        expect(updated.title).toBe('Updated Title');
        expect(updated.description).toBe('Updated Desc');
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('deleteAttendanceTable', () => {
    it('should delete attendance table and return it', async () => {
      try {
        const deleted = await attendanceTableRepository.deleteAttendanceTable({
          attendanceTableId: attendanceTableId,
        });

        expect(deleted.id).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });
});
