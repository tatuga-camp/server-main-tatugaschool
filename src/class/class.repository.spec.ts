import { PrismaService } from '../prisma/prisma.service';
import { ClassRepository } from './class.repository';

const prismaService = new PrismaService();

describe('ClassRepository', () => {
  let classRepository: ClassRepository;

  const schoolId = '6613bfe8801a6be179b08aaa';
  const userId = '6613bfe8801a6be179b08fff';
  let classId: string;

  beforeEach(() => {
    classRepository = new ClassRepository(prismaService, {} as any); // mock storageService
  });

  describe('create', () => {
    it('should create class successfully', async () => {
      try {
        const created = await classRepository.create({
          title: 'นักเรียนชั้นมัธยมศึกษาปีที่ 5/1',
          level: 'มัธยมศึกษาปีที่ 5',
          description: 'Mock class for testing',
          schoolId: schoolId,
          userId: userId,
        });

        expect(created.title).toBe('นักเรียนชั้นมัธยมศึกษาปีที่ 5/1');
        expect(created.level).toBe('มัธยมศึกษาปีที่ 5');
        expect(created.description).toBe('Mock class for testing');
        expect(created.schoolId).toBe(schoolId);
        expect(created.userId).toBe(userId);

        classId = created.id;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('findById', () => {
    it('should find class by ID', async () => {
      try {
        const found = await classRepository.findById({
          classId: classId,
        });
        expect(found?.id).toBe(classId);
      } catch (error) {
        console.error('findById failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of classes', async () => {
      try {
        const result = await classRepository.findMany({
          where: {
            schoolId: schoolId,
          },
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((cls) => cls.id === classId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('findAll', () => {
    it('should return all classes', async () => {
      try {
        const result = await classRepository.findAll();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        console.error('findAll failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update class title', async () => {
      try {
        const updated = await classRepository.update({
          where: {
            id: classId,
          },
          data: {
            title: 'Updated Title',
          },
        });
        expect(updated.title).toBe('Updated Title');
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should count classes with schoolId', async () => {
      try {
        const count = await classRepository.count({
          where: {
            schoolId: schoolId,
          },
        });
        expect(count).toBeGreaterThan(0);
      } catch (error) {
        console.error('Count failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete class and return it', async () => {
      try {
        const deleted = await classRepository.delete({
          classId: classId,
        });
        expect(deleted.id).toBe(classId);
        classId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });
});
