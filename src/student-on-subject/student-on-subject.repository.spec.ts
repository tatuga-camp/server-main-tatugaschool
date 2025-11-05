import { PrismaService } from '../prisma/prisma.service';
import { StudentOnSubjectRepository } from './student-on-subject.repository';
import { StorageService } from '../storage/storage.service';

describe('StudentOnSubjectRepository', () => {
  const prismaService = new PrismaService();
  const storageService = {
    DeleteFileOnStorage: jest.fn().mockResolvedValue(null),
  } as unknown as StorageService;

  let studentOnSubjectRepository: StudentOnSubjectRepository;

  const studentId = '66520ff9016313d8fc1db111';
  const subjectId = '665210c46a4d5d00c631b444';
  const subjectId1 = '665210c46a4d5d00c631b445';
  const classId = '6652146a6a4d5d00c631b556';
  const schoolId = '66500e4ea1b3f5370ac122f1';

  let studentOnSubjectId: string;

  beforeEach(() => {
    studentOnSubjectRepository = new StudentOnSubjectRepository(
      prismaService,
      storageService,
    );
  });

  // beforeEach(async () => {
  //   await prismaService.studentOnSubject.deleteMany({
  //     where: {
  //       subjectId: subjectId1,
  //     },
  //   });
  // });

  describe('createStudentOnSubject', () => {
    it('should create a new studentOnSubject with full profile', async () => {
      try {
        const created = await studentOnSubjectRepository.createStudentOnSubject(
          {
            title: 'ด.ช.',
            firstName: 'พงศธร',
            lastName: 'ใจดี',
            number: '01',
            photo: 'https://example.com/photo.jpg',
            blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
            studentId: studentId,
            classId: classId,
            subjectId: subjectId,
            schoolId: schoolId,
          },
        );

        expect(created).toHaveProperty('id');
        expect(created.title).toBe('ด.ช.');
        expect(created.firstName).toBe('พงศธร');
        expect(created.lastName).toBe('ใจดี');
        expect(created.number).toBe('01');
        expect(created.photo).toBe('https://example.com/photo.jpg');
        expect(created.blurHash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
        expect(created.studentId).toBe(studentId);
        expect(created.classId).toBe(classId);
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);

        studentOnSubjectId = created.id;
      } catch (error) {
        console.error('createStudentOnSubject failed:', error);
        throw error;
      }
    });
  });

  describe('getStudentOnSubjectById', () => {
    it('should return correct record by ID', async () => {
      try {
        const found = await studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: studentOnSubjectId,
        });

        expect(found).toBeDefined();
        expect(found.id).toBe(studentOnSubjectId);
      } catch (error) {
        console.error('getStudentOnSubjectById failed:', error);
        throw error;
      }
    });
  });

  describe('getStudentOnSubjectsByStudentId', () => {
    it('should return all related records for studentId', async () => {
      try {
        const result =
          await studentOnSubjectRepository.getStudentOnSubjectsByStudentId({
            studentId: studentId,
          });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === studentOnSubjectId)).toBe(true);
      } catch (error) {
        console.error('getStudentOnSubjectsByStudentId failed:', error);
        throw error;
      }
    });
  });

  describe('getStudentOnSubjectsBySubjectId', () => {
    it('should return all related records for subjectId', async () => {
      try {
        const result =
          await studentOnSubjectRepository.getStudentOnSubjectsBySubjectId({
            subjectId: subjectId,
          });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === studentOnSubjectId)).toBe(true);
      } catch (error) {
        console.error('getStudentOnSubjectsBySubjectId failed:', error);
        throw error;
      }
    });
  });

  describe('updateStudentOnSubject', () => {
    it('should update isActive field', async () => {
      try {
        const updated = await studentOnSubjectRepository.updateStudentOnSubject(
          {
            query: {
              studentOnSubjectId: studentOnSubjectId,
            },
            data: {
              isActive: false,
            },
          },
        );

        expect(updated.id).toBe(studentOnSubjectId);
        expect(updated.isActive).toBe(false);
      } catch (error) {
        console.error('updateStudentOnSubject failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should find many by filter', async () => {
      try {
        const result = await studentOnSubjectRepository.findMany({
          where: {
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

  describe('findFirst', () => {
    it('should find first match', async () => {
      try {
        const result = await studentOnSubjectRepository.findFirst({
          where: {
            studentId: studentId,
            subjectId: subjectId,
          },
        });

        expect(result).not.toBeNull();
        expect(result.studentId).toBe(studentId);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update using Prisma updateArgs', async () => {
      try {
        const updated = await studentOnSubjectRepository.update({
          where: {
            id: studentOnSubjectId,
          },
          data: {
            isActive: true,
          },
        });

        expect(updated.id).toBe(studentOnSubjectId);
        expect(updated.isActive).toBe(true);
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('createMany', () => {
    it('should create multiple records', async () => {
      try {
        const result = await studentOnSubjectRepository.createMany({
          data: [
            {
              studentId: '66520ff9016313d8fc1db112',
              subjectId: subjectId1,
              classId: classId,
              schoolId: schoolId,
              title: 'ด.ญ.',
              firstName: 'ดาว',
              lastName: 'ใจสวย',
              number: '02',
              photo: 'https://example.com/p2.jpg',
              blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
            },
            {
              studentId: '66520ff9016313d8fc1db113',
              subjectId: subjectId1,
              classId: classId,
              schoolId: schoolId,
              title: 'นาย',
              firstName: 'เอก',
              lastName: 'ใจเด็ด',
              number: '03',
              photo: 'https://example.com/p3.jpg',
              blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
            },
          ],
        });

        expect(result.count).toBeGreaterThanOrEqual(2);
      } catch (error) {
        console.error('createMany failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete and clean up related data', async () => {
      try {
        const created = await studentOnSubjectRepository.createStudentOnSubject(
          {
            title: 'ด.ญ.',
            firstName: 'ลบ',
            lastName: 'ทดสอบ',
            number: '99',
            photo: 'https://example.com/del.jpg',
            blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
            studentId: '66520ff9016313d8fc1db114',
            classId: classId,
            subjectId: subjectId,
            schoolId: schoolId,
          },
        );

        const result = await studentOnSubjectRepository.delete({
          studentOnSubjectId: created.id,
        });

        expect(result.id).toBe(created.id);
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
