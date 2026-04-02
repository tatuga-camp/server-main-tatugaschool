import { AttendanceRepository } from './attendance.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import { RedisService } from '../redis/redis.service';

describe('AttendanceRepository', () => {
  const prismaService = new PrismaService();
  const redisService = {
    hget: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  } as any as RedisService;
  let attendanceRepository: AttendanceRepository;
  const generateObjectId = () =>
    Math.floor(Math.random() * 10000000000000000)
      .toString(16)
      .padStart(24, '0');

  let attendanceRowId = generateObjectId();
  let studentOnSubjectId = generateObjectId();
  let subjectId = generateObjectId();
  let attendanceTableId = generateObjectId();
  let studentId = generateObjectId();
  let schoolId = generateObjectId();
  let attendanceId: string;

  beforeEach(() => {
    attendanceRepository = new AttendanceRepository(
      prismaService,
      redisService,
    );
  });

  describe('create', () => {
    it('should create new attendance', async () => {
      try {
        const attendance = await attendanceRepository.create({
          data: {
            attendanceRowId: attendanceRowId,
            studentOnSubjectId: studentOnSubjectId,
            status: 'Present',
            subjectId: subjectId,
            studentId: studentId,
            schoolId: schoolId,
            attendanceTableId: attendanceTableId,
            startDate: new Date(),
            endDate: new Date(),
          },
        });

        expect(attendance.status).toBe('Present');
        expect(attendance.attendanceRowId).toBe(attendanceRowId);
        expect(attendance.attendanceTableId).toBe(attendanceTableId);

        attendanceId = attendance.id;
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getAttendanceById', () => {
    it('should return attendance by id', async () => {
      try {
        const attendance = await attendanceRepository.getAttendanceById({
          attendanceId: attendanceId,
        });

        expect(attendance?.id).toBe(attendanceId);
        expect(attendance.attendanceRowId).toBe(attendanceRowId);
        expect(attendance.attendanceTableId).toBe(attendanceTableId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    it('should return null for invalid id', async () => {
      const attendance = await attendanceRepository.getAttendanceById({
        attendanceId: '123456789012345678901234',
      });
      expect(attendance).toBeNull();
    });
  });

  describe('updateAttendanceById', () => {
    it('should update attendance status', async () => {
      try {
        const updated = await attendanceRepository.updateAttendanceById({
          query: {
            attendanceId: attendanceId,
          },
          body: {
            status: 'Late',
            note: 'มาสาย 10 นาที',
          },
        });

        expect(updated.status).toBe('Late');
        expect(updated.note).toBe('มาสาย 10 นาที');
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of attendances for subject', async () => {
      try {
        const list = await attendanceRepository.findMany({
          where: {
            subjectId: subjectId,
          },
        });

        expect(Array.isArray(list)).toBe(true);
        expect(list.length).toBeGreaterThan(0);
        expect(list[0]).toHaveProperty('id');
        expect(list[0].subjectId).toBe(subjectId);
        expect(['Present', 'Absent', 'Late']).toContain(list[0].status);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
    it('should return empty array for unknown subjectId', async () => {
      const result = await attendanceRepository.findMany({
        where: { subjectId: '123456789012345678901234' },
      });
      expect(result).toEqual([]);
    });
  });
});
