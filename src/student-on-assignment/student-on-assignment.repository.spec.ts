import { PrismaService } from '../prisma/prisma.service';
import { StudentOnAssignmentRepository } from './student-on-assignment.repository';
import { v4 as uuid } from 'uuid';

describe('StudentOnAssignmentRepository', () => {
  const prismaService = new PrismaService();
  let studentOnAssignmentRepository: StudentOnAssignmentRepository;

  const studentId = '66520ff9016313d8fc1db111';
  const assignmentId = '6652112b6a4d5d00c631b222';
  const assignmentId1 = '6652112b6a4d5d00c631b333';
  const studentOnSubjectId = '665211f76a4d5d00c631b333';
  const schoolId = '66500e4ea1b3f5370ac122f1';
  const subjectId = '665210c46a4d5d00c631b444';
  let studentOnAssignmentId: string;
  let createdStudentOnSubjectIds: string[] = [];

  beforeEach(() => {
    studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      prismaService,
    );
  });
  
  beforeEach(async () => {
    try {
      await prismaService.studentOnAssignment.deleteMany({
        where: {
          assignmentId: assignmentId1,
        },
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  describe('create', () => {
    it('should create a student-on-assignment record correctly', async () => {
      try {
        const created = await studentOnAssignmentRepository.create({
          title: 'ด.ช.',
          firstName: 'สมศักดิ์',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '12',
          score: 8,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          body: 'ส่งงานเรียบร้อยแล้วครับ',
          studentId: studentId,
          assignmentId: assignmentId,
          studentOnSubjectId: studentOnSubjectId,
          schoolId: schoolId,
          subjectId: subjectId,
        });

        expect(created.id).toBeDefined();
        expect(created.title).toBe('ด.ช.');
        expect(created.firstName).toBe('สมศักดิ์');
        expect(created.lastName).toBe('ใจดี');
        expect(created.number).toBe('12');
        expect(created.score).toBe(8);
        expect(created.body).toBe('ส่งงานเรียบร้อยแล้วครับ');
        expect(created.studentId).toBe(studentId);
        expect(created.assignmentId).toBe(assignmentId);
        expect(created.studentOnSubjectId).toBe(studentOnSubjectId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.subjectId).toBe(subjectId);

        studentOnAssignmentId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    try {
      it('should return student-on-assignment by id', async () => {
        try {
          const result = await studentOnAssignmentRepository.getById({
            studentOnAssignmentId,
          });

          expect(result.id).toBe(studentOnAssignmentId);
          expect(result.studentId).toBe(studentId);
        } catch (error) {
          console.error('getById failed:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('getById failed:', error);
      throw error;
    }
  });

  describe('getByAssignmentId', () => {
    try {
      it('should return all student-on-assignments by assignmentId', async () => {
        try {
          const result = await studentOnAssignmentRepository.getByAssignmentId({
            assignmentId,
          });

          expect(Array.isArray(result)).toBe(true);
          expect(result.some((r) => r.id === studentOnAssignmentId)).toBe(true);
        } catch (error) {
          console.error('getByAssignmentId failed:', error);
          throw error;
        }
      });
    } catch (error) {
      console.error('getByAssignmentId failed:', error);
      throw error;
    }
  });

  describe('getByStudentId', () => {
    it('should return all student-on-assignments by studentId', async () => {
      try {
        const result = await studentOnAssignmentRepository.getByStudentId({
          studentId,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === studentOnAssignmentId)).toBe(true);
      } catch (error) {
        console.error('getByStudentId failed:', error);
        throw error;
      }
    });
  });

  describe('getByStudentIdAndAssignmentId', () => {
    it('should return student-on-assignment by studentId and assignmentId', async () => {
      try {
        const result =
          await studentOnAssignmentRepository.getByStudentIdAndAssignmentId({
            studentId,
            assignmentId,
          });

        expect(result.assignmentId).toBe(assignmentId);
        expect(result.studentId).toBe(studentId);
        expect(result.id).toBe(studentOnAssignmentId);
      } catch (error) {
        console.error('getByStudentIdAndAssignmentId failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    try {
      it('should return many records with condition', async () => {
        const result = await studentOnAssignmentRepository.findMany({
          where: {
            assignmentId: assignmentId,
          },
        });
        expect(Array.isArray(result)).toBe(true);
      });
    } catch (error) {
      console.error('findMany failed:', error);
      throw error;
    }
  });

  describe('update', () => {
    it('should update score and status', async () => {
      try {
        const updated = await studentOnAssignmentRepository.update({
          where: { id: studentOnAssignmentId },
          data: {
            score: 9.5,
            status: 'SUBMITTED',
            isAssigned: true,
            body: 'งานส่งเรียบร้อย',
          },
        });

        expect(updated.score).toBe(9.5);
        expect(updated.status).toBe('SUBMITTED');
        expect(updated.isAssigned).toBe(true);
        expect(updated.body).toBe('งานส่งเรียบร้อย');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('updateMany', () => {
    it('should update multiple fields and verify updated values', async () => {
      try {
        // อัปเดต
        const result = await studentOnAssignmentRepository.updateMany({
          where: {
            assignmentId: assignmentId,
          },
          data: {
            isAssigned: true,
            score: 99,
            body: 'ระบบอัปเดตเรียบร้อย',
          },
        });
        // ตรวจว่าอัปเดตได้อย่างน้อย 1 รายการ
        expect(result.count).toBeGreaterThanOrEqual(1);

        // ดึงข้อมูลใหม่มาตรวจสอบ
        const updatedRecords = await studentOnAssignmentRepository.findMany({
          where: {
            assignmentId: assignmentId,
          },
        });

        for (const record of updatedRecords) {
          expect(record.isAssigned).toBe(true);
          expect(record.score).toBe(99);
          expect(record.body).toBe('ระบบอัปเดตเรียบร้อย');
        }
      } catch (error) {
        console.error('updateMany failed:', error);
        throw error;
      }
    });
  });

  describe('createMany', () => {
    it('should create multiple student-on-assignment records', async () => {
      try {
        const result = await studentOnAssignmentRepository.createMany({
          data: [
            {
              title: 'นาย',
              firstName: 'ต้น',
              lastName: 'กล้า',
              number: '03',
              blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
              photo: 'https://example.com/t1.jpg',
              studentId: '66520ff9016313d8fc1db111',
              assignmentId: assignmentId1,
              subjectId: subjectId,
              schoolId: schoolId,
              studentOnSubjectId: '665211f76a4d5d00c631b333',
            },
            {
              title: 'นางสาว',
              firstName: 'ดาว',
              lastName: 'สวย',
              number: '04',
              blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
              photo: 'https://example.com/t2.jpg',
              studentId: '66520ff9016313d8fc1db112',
              assignmentId: assignmentId1,
              subjectId: subjectId,
              schoolId: schoolId,
              studentOnSubjectId: '665211f76a4d5d00c631b334',
            },
          ],
        });

        expect(result.count).toBeGreaterThanOrEqual(2);
      } catch (error) {
        console.error('create many failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete student-on-assignment by id', async () => {
      try {
        const result = await studentOnAssignmentRepository.delete({
          studentOnAssignmentId: studentOnAssignmentId,
        });

        expect(result.message).toBe(
          'Student on assignment deleted successfully',
        );
        studentOnAssignmentId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });

  describe('deleteByAssignmentId', () => {
    try {
      it('should delete all records by assignmentId', async () => {
        const result = await studentOnAssignmentRepository.deleteByAssignmentId(
          {
            assignmentId: assignmentId,
          },
        );
        expect(result.message).toBe(
          'Student on assignment deleted successfully',
        );
      });
    } catch (error) {
      console.error('deleteByAssignmentId failed:', error);
      throw error;
    }
  });
});
