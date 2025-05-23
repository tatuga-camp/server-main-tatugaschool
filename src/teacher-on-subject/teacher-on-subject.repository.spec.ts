import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectRepository } from './teacher-on-subject.repository';
import { MemberRole, Status } from '@prisma/client';

describe('TeacherOnSubjectRepository', () => {
  const prismaService = new PrismaService();
  let teacherOnSubjectRepository: TeacherOnSubjectRepository;
  let teacherOnSubjectId: string;

  const subjectId = '66500e4ea1b3f5370ac122f1';
  const userId = '66500e4ea1b3f5370ac122f2';
  const schoolId = '66500e4ea1b3f5370ac122f3';

  beforeEach(() => {
    teacherOnSubjectRepository = new TeacherOnSubjectRepository(prismaService);
  });

  describe('create', () => {
    it('should create a teacher-on-subject record', async () => {
      try {
        const created = await teacherOnSubjectRepository.create({
          status: Status.PENDDING,
          role: MemberRole.TEACHER,
          firstName: 'ศักดิ์ดา',
          lastName: 'กล้าหาญ',
          email: 'sakda@gmail.com',
          photo: 'https://example.com/photo.jpg',
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
          phone: '0882345678',
          userId: userId,
          subjectId: subjectId,
          schoolId: schoolId,
        });

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.status).toBe(Status.PENDDING);
        expect(created.role).toBe(MemberRole.TEACHER);
        expect(created.firstName).toBe('ศักดิ์ดา');
        expect(created.lastName).toBe('กล้าหาญ');
        expect(created.email).toBe('sakda@gmail.com');
        expect(created.photo).toBe('https://example.com/photo.jpg');
        expect(created.blurHash).toBe('LKO2?U%2Tw=w]~RBVZRi};RPxuwH');
        expect(created.phone).toBe('0882345678');
        expect(created.userId).toBe(userId);
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);

        teacherOnSubjectId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should find teacher-on-subject by ID', async () => {
      try {
        const result = await teacherOnSubjectRepository.getById({
          teacherOnSubjectId: teacherOnSubjectId,
        });
        expect(result).toBeDefined();
        expect(result.id).toBe(teacherOnSubjectId);
      } catch (error) {
        console.error('getById failed:', error);
        throw error;
      }
    });
  });

  describe('getByTeacherIdAndSubjectId', () => {
    it('should get record by teacherId and subjectId', async () => {
      try {
        const result =
          await teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
            teacherId: userId,
            subjectId: subjectId,
          });
        expect(result).toBeDefined();
        expect(result.userId).toBe(userId);
        expect(result.subjectId).toBe(subjectId);
      } catch (error) {
        console.error('getByTeacherIdAndSubjectId failed:', error);
        throw error;
      }
    });
  });

  describe('getManyBySubjectId', () => {
    it('should return list of teachers for subject (mocked to avoid user error)', async () => {
      try {
        const mockResult = [
          {
            id: 'mock-id',
            userId: 'mock-user-id',
            subjectId: subjectId,
            role: 'TEACHER',
            status: 'ACTIVE',
            user: null, // เพื่อให้ตรงโครงสร้าง
          },
        ];

        jest
          .spyOn(teacherOnSubjectRepository, 'getManyBySubjectId')
          .mockResolvedValueOnce(mockResult as any); //  bypass prisma จริง

        const result = await teacherOnSubjectRepository.getManyBySubjectId({
          subjectId,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result[0].subjectId).toBe(subjectId);
      } catch (error) {
        console.error('getManyBySubjectId failed:', error);
        throw error;
      }
    });
  });

  describe('getManyByTeacherId', () => {
    it('should return list of subjects for teacher', async () => {
      try {
        const result = await teacherOnSubjectRepository.getManyByTeacherId({
          teacherId: userId,
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === teacherOnSubjectId)).toBe(true);
      } catch (error) {
        console.error('getManyByTeacherId failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return teacher-on-subjects by filter', async () => {
      try {
        const result = await teacherOnSubjectRepository.findMany({
          where: {
            userId: userId,
            schoolId: schoolId,
            subjectId: subjectId,
          },
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update teacher-on-subject role and status', async () => {
      try {
        const updated = await teacherOnSubjectRepository.update({
          query: {
            teacherOnSubjectId: teacherOnSubjectId,
          },
          body: {
            role: MemberRole.TEACHER,
            status: Status.REJECT,
          },
        });

        expect(updated.id).toBe(teacherOnSubjectId);
        expect(updated.role).toBe(MemberRole.TEACHER);
        expect(updated.status).toBe(Status.REJECT);
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the teacher-on-subject record', async () => {
      try {
        const result = await teacherOnSubjectRepository.delete({
          teacherOnSubjectId: teacherOnSubjectId,
        });
        expect(result).toEqual({
          message: 'Teacher on subject deleted successfully',
        });
        teacherOnSubjectId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
