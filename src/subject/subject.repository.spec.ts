import { PrismaService } from '../prisma/prisma.service';
import { SubjectRepository } from './subject.repository';

describe('SubjectRepository', () => {
  const prismaService = new PrismaService();
  let subjectRepository: SubjectRepository;
  let subjectId: string;
  let subjectCode = `SUB${Date.now()}`;
  const schoolId = '66500e4ea1b3f5370ac122f1';
  const classId = '66500e4ea1b3f5370ac122f3';
  const userId = '66500e4ea1b3f5370ac122f2';

  beforeEach(() => {
    subjectRepository = new SubjectRepository(prismaService, {
      DeleteFileOnStorage: async () => {},
    } as any);
  });

  describe('createSubject', () => {
    it('should create a subject', async () => {
      try {
        const created = await subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          code: subjectCode,
          educationYear: '1/2566',
          description: 'เนื้อหาคณิตพื้นฐาน',
          backgroundImage: 'https://example.com/bg.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          order: 0,
          classId,
          userId,
          schoolId,
        });

        expect(created).toBeDefined();
        expect(created.code).toBe(subjectCode);
        expect(created.title).toBe('คณิตศาสตร์');
        expect(created.educationYear).toBe('1/2566');
        expect(created.description).toBe('เนื้อหาคณิตพื้นฐาน');
        expect(created.backgroundImage).toBe('https://example.com/bg.png');
        expect(created.blurHash).toBe('LEHV6nWB2yk8pyo0adR*.7kCMdnj');
        expect(created.order).toBe(0);
        expect(created.classId).toBe(classId);
        expect(created.userId).toBe(userId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.id).toBeDefined();
        subjectId = created.id;
      } catch (error) {
        console.error('createSubject failed:', error);
        throw error;
      }
    });
  });

  describe('getSubjectById', () => {
    it('should return subject by id', async () => {
      try {
        const result = await subjectRepository.getSubjectById({
          subjectId,
        });

        expect(result).toBeDefined();
        expect(result?.id).toBe(subjectId);
      } catch (error) {
        console.error('getSubjectById failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find by unique id', async () => {
      try {
        const result = await subjectRepository.findUnique({
          where: { id: subjectId },
        });

        expect(result).toBeDefined();
        expect(result?.id).toBe(subjectId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should find all by schoolId and include created subject', async () => {
      try {
        const results = await subjectRepository.findMany({
          where: { schoolId },
        });

        expect(Array.isArray(results)).toBe(true);
        const found = results.find((s) => s.id === subjectId);
        expect(found).toBeDefined();
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should count >= 1 for schoolId', async () => {
      try {
        const count = await subjectRepository.count({
          where: { schoolId },
        });

        expect(count).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.error('count failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update title and description', async () => {
      try {
        const updated = await subjectRepository.update({
          where: { id: subjectId },
          data: {
            title: 'คณิตศาสตร์เพิ่มเติม',
            description: 'อัปเดตคำอธิบายแล้ว',
          },
        });

        expect(updated.id).toBe(subjectId);
        expect(updated.title).toBe('คณิตศาสตร์เพิ่มเติม');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('reorderSubjects', () => {
    it('should reorder subjects and match correct order', async () => {
      try {
        const result = await subjectRepository.reorderSubjects({
          subjectIds: [subjectId],
        });

        const updated = result.find((s) => s.id === subjectId);
        expect(updated).toBeDefined();
        expect(updated.order).toBe(0);
      } catch (error) {
        console.error('reorderSubjects failed:', error);
        throw error;
      }
    });
  });

  describe('deleteSubject', () => {
    it('should delete the subject', async () => {
      try {
        const deleted = await subjectRepository.deleteSubject({
          subjectId,
        });

        expect(deleted.id).toBe(subjectId);
      } catch (error) {
        console.error('deleteSubject failed:', error);
        throw error;
      }
    });
  });
});
