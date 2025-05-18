import { PrismaService } from '../prisma/prisma.service';
import { SubjectRepository } from './subject.repository';

describe('SubjectRepository', () => {
  const prismaService = new PrismaService();
  let subjectRepository: SubjectRepository;
  let subjectId: string;

  const classId = '6645d000d1a91edb9e0a7777';
  const schoolId = '66500e4ea1b3f5370ac122f1';
  const userId = '66500e4ea1b3f5370ac122f2';

  beforeEach(() => {
    subjectRepository = new SubjectRepository(prismaService, {
      DeleteFileOnStorage: async () => {},
    } as any);
  });

  afterAll(async () => {
    try {
      if (subjectId) {
        await subjectRepository.deleteSubject({
          subjectId: subjectId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('createSubject', () => {
    it('should create a subject successfully', async () => {
      try {
        const created = await subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '1/2566',
          description: 'รายวิชาทดลอง',
          backgroundImage: 'https://example.com/bg.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          order: 0,
          classId: classId,
          userId: userId,
          code: 'SUB001',
          schoolId: schoolId,
        });

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.title).toBe('วิทยาศาสตร์');
        expect(created.educationYear).toBe('1/2566');
        expect(created.description).toBe('รายวิชาทดลอง');
        expect(created.backgroundImage).toBe('https://example.com/bg.png');
        expect(created.blurHash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
        expect(created.order).toBe(0);
        expect(created.classId).toBe(classId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.code).toBe('SUB001');
        expect(created.userId).toBe(userId);

        subjectId = created.id;
      } catch (error) {
        console.error('createSubject failed:', error);
        throw error;
      }
    });
  });

  describe('getSubjectById', () => {
    it('should retrieve subject by ID', async () => {
      try {
        const result = await subjectRepository.getSubjectById({
          subjectId: subjectId,
        });

        expect(result).toBeDefined();
        expect(result.id).toBe(subjectId);
        expect(result.title).toBe('วิทยาศาสตร์');
        expect(result.educationYear).toBe('1/2566');
        expect(result.description).toBe('รายวิชาทดลอง');
        expect(result.backgroundImage).toBe('https://example.com/bg.png');
        expect(result.blurHash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
        expect(result.order).toBe(0);
        expect(result.classId).toBe(classId);
        expect(result.schoolId).toBe(schoolId);
        expect(result.code).toBe('SUB001');
        expect(result.userId).toBe(userId);
      } catch (error) {
        console.error('getSubjectById failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find unique subject by id', async () => {
      try {
        const result = await subjectRepository.findUnique({
          where: {
            id: subjectId,
          },
        });

        expect(result).toBeDefined();
        expect(result.id).toBe(subjectId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return array of subjects by schoolId', async () => {
      try {
        const results = await subjectRepository.findMany({
          where: {
            schoolId: schoolId,
          },
        });

        expect(Array.isArray(results)).toBe(true);
        expect(results.some((s) => s.id === subjectId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should count subjects correctly', async () => {
      try {
        const count = await subjectRepository.count({
          where: {
            schoolId: schoolId,
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
    it('should update subject title and description', async () => {
      try {
        const updated = await subjectRepository.update({
          where: {
            id: subjectId,
          },
          data: {
            title: 'วิทยาศาสตร์เพิ่มเติม 2',
            description: 'อัปเดตคำอธิบาย',
          },
        });

        expect(updated.id).toBe(subjectId);
        expect(updated.title).toBe('วิทยาศาสตร์เพิ่มเติม 2');
        expect(updated.description).toBe('อัปเดตคำอธิบาย');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('reorderSubjects', () => {
    it('should reorder subjects by given list', async () => {
      try {
        const reordered = await subjectRepository.reorderSubjects({
          subjectIds: [subjectId],
        });

        expect(Array.isArray(reordered)).toBe(true);
        expect(reordered[0].id).toBe(subjectId);
        expect(reordered[0].order).toBe(0);
      } catch (error) {
        console.error('reorderSubjects failed:', error);
        throw error;
      }
    });
  });

  describe('deleteSubject', () => {
    it('should delete subject and clean up related data', async () => {
      try {
        const deleted = await subjectRepository.deleteSubject({
          subjectId: subjectId,
        });
        expect(deleted.id).toBe(subjectId);
        subjectId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('deleteSubject failed:', error);
        throw error;
      }
    });
  });
});
