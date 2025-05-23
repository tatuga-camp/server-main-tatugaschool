import { PrismaService } from '../prisma/prisma.service';
import { StudentRepository } from './student.repository';

describe('StudentRepository', () => {
  const prismaService = new PrismaService();
  let studentRepository: StudentRepository;

  const classId = '6645d000d1a91edb9e0a7777';
  const schoolId = '66500e4ea1b3f5370ac122f1';
  let studentId: string;

  beforeEach(() => {
    studentRepository = new StudentRepository(prismaService, {
      uploadFile: async () => '',
    } as any); // mock GoogleStorageService
  });

  describe('create', () => {
    it('should create student and related records', async () => {
      try {
        const created = await studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมชาย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '12',
          classId: classId,
          schoolId: schoolId,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        expect(created.firstName).toBe('สมชาย');
        expect(created.lastName).toBe('ใจดี');
        expect(created.classId).toBe(classId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.photo).toBe('https://example.com/photo.jpg');
        expect(created.number).toBe('12');
        expect(created.id).toBeDefined();

        studentId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findById', () => {
    it('should find student by ID', async () => {
      try {
        const found = await studentRepository.findById({
          studentId: studentId,
        });
        expect(found.id).toBe(studentId);
        expect(found.firstName).toBe('สมชาย');
        expect(found.lastName).toBe('ใจดี');
        expect(found.classId).toBe(classId);
        expect(found.schoolId).toBe(schoolId);
        expect(found.photo).toBe('https://example.com/photo.jpg');
        expect(found.number).toBe('12');
      } catch (error) {
        console.error('findById failed:', error);
        throw error;
      }
    });
  });

  describe('findByClassId', () => {
    it('should find students by classId', async () => {
      try {
        const found = await studentRepository.findByClassId({
          classId: classId,
        });
        expect(Array.isArray(found)).toBe(true);
        expect(found.some((s) => s.id === studentId)).toBe(true);
      } catch (error) {
        console.error('findByClassId failed:', error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should count students in class', async () => {
      try {
        const count = await studentRepository.count({
          where: {
            classId: classId,
          },
        });
        expect(count).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.error('count failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update all updatable student fields', async () => {
      try {
        const updated = await studentRepository.update({
          query: {
            studentId: studentId,
          },
          body: {
            title: 'นางสาว',
            firstName: 'สมปอง',
            lastName: 'พะยองเดช',
            photo: 'https://example.com/photo1.jpg',
            blurHash: 'LKO2?U%2Tw=^]-;c,of6^]~o~oR*',
            number: '99',
          },
        });

        expect(updated.id).toBe(studentId);
        expect(updated.title).toBe('นางสาว');
        expect(updated.firstName).toBe('สมปอง');
        expect(updated.lastName).toBe('พะยองเดช');
        expect(updated.photo).toBe('https://example.com/photo1.jpg');
        expect(updated.blurHash).toBe('LKO2?U%2Tw=^]-;c,of6^]~o~oR*');
        expect(updated.number).toBe('99');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the student and cascade', async () => {
      try {
        const deleted = await studentRepository.delete({
          studentId: studentId,
        });
        expect(deleted.id).toBe(studentId);
        studentId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
