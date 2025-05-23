import { FileAssignmentRepository } from './file-assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleStorageService } from '../google-storage/google-storage.service';

const prismaService = new PrismaService();

const mockGoogleStorage = {
  DeleteFileOnStorage: jest.fn().mockResolvedValue(undefined),
} as unknown as GoogleStorageService;

describe('FileAssignmentRepository', () => {
  let fileAssignmentRepository: FileAssignmentRepository;
  const assignmentId = '6613bfe8801a6be179b0a111';
  const subjectId = '6613bfe8801a6be179b0a222';
  const schoolId = '6613bfe8801a6be179b0a333';
  let fileId: string;

  beforeEach(() => {
    fileAssignmentRepository = new FileAssignmentRepository(prismaService, mockGoogleStorage);
  });

  describe('create', () => {
    it('should create file on assignment', async () => {
      try {
        const created = await fileAssignmentRepository.create({
          assignmentId: assignmentId,
          subjectId: subjectId,
          schoolId: schoolId,
          type: 'image/png',
          url: 'https://example.com/file.png',
          blurHash: 'LKO2?U%2Tw=w]~RBVZRj;RPxuwH',
          size: 1234,
        });

        expect(created.assignmentId).toBe(assignmentId);
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.type).toBe('image/png');
        expect(created.url).toBe('https://example.com/file.png');
        expect(created.size).toBe(1234);


        fileId = created.id;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should get file by id', async () => {
      try {
        const result = await fileAssignmentRepository.getById({ 
            fileOnAssignmentId: fileId 
        });
        expect(result.id).toBe(fileId);
      } catch (error) {
        console.error('getById failed:', error);
        throw error;
      }
    });
  });

  describe('getByAssignmentId', () => {
    it('should get all files for an assignment', async () => {
      try {
        const result = await fileAssignmentRepository.getByAssignmentId({ 
            assignmentId: assignmentId 
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((f) => f.id === fileId)).toBe(true);
      } catch (error) {
        console.error('getByAssignmentId failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of files', async () => {
      try {
        const result = await fileAssignmentRepository.findMany({ 
            where: { 
                assignmentId: assignmentId 
            } 
        });
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete file and return success message', async () => {
      try {
        const result = await fileAssignmentRepository.delete({ 
            fileOnAssignmentId: fileId 
        });
        expect(result.message).toBe('File deleted');
        fileId = ''; // ป้องกันการลบซ้ำ
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });

  describe('deleteByAssignmentId', () => {
    it('should delete all files by assignmentId', async () => {
      try {
        // สร้างไฟล์จำลองใหม่
        const created = await fileAssignmentRepository.create({
          assignmentId: assignmentId,
          subjectId: subjectId,
          schoolId: schoolId,
          type: 'image/jpeg',
          url: 'https://example.com/temp.jpg',
          size: 2048,
        });

        const result = await fileAssignmentRepository.deleteByAssignmentId({ 
            assignmentId: assignmentId 
        });
        expect(result.message).toBe('Files deleted');
      } catch (error) {
        console.error('deleteByAssignmentId failed:', error);
        throw error;
      }
    });
  });
});
