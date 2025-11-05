import { FileOnStudentAssignmentRepository } from './file-on-student-assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StudentAssignmentContentType } from '@prisma/client';

const prismaService = new PrismaService();

const mockGoogleStorage = {
  DeleteFileOnStorage: jest.fn().mockResolvedValue(undefined),
} as unknown as StorageService;

describe('FileOnStudentAssignmentRepository', () => {
  let fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository;
  const assignmentId = '6613bfe8801a6be179b0a111';
  const subjectId = '6613bfe8801a6be179b0a222';
  const schoolId = '6613bfe8801a6be179b0a333';
  const studentId = '6613bfe8801a6be179b0a444';
  const studentOnAssignmentId = '6613bfe8801a6be179b0a555';

  let fileId: string;

  beforeEach(() => {
    fileOnStudentAssignmentRepository = new FileOnStudentAssignmentRepository(
      prismaService,
      mockGoogleStorage,
    );
  });

  describe('create', () => {
    it('should create file on student assignment', async () => {
      try {
        const created = await fileOnStudentAssignmentRepository.create({
          data: {
            type: 'image/png',
            body: 'https://example.com/file.png',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRj;RPxuwH',
            size: 1024,
            contentType: 'FILE',
            assignmentId: assignmentId,
            subjectId: subjectId,
            schoolId: schoolId,
            studentId: studentId,
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });

        expect(created.type).toBe('image/png');
        expect(created.body).toBe('https://example.com/file.png');
        expect(created.blurHash).toBe('LKO2?U%2Tw=w]~RBVZRj;RPxuwH');
        expect(created.size).toBe(1024);
        expect(created.contentType).toBe(StudentAssignmentContentType.FILE);
        expect(created.assignmentId).toBe(assignmentId);
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);
        expect(created.studentId).toBe(studentId);
        expect(created.studentOnAssignmentId).toBe(studentOnAssignmentId);

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
        const result = await fileOnStudentAssignmentRepository.getById({
          fileOnStudentAssignmentId: fileId,
        });
        expect(result.id).toBe(fileId);
      } catch (error) {
        console.error('getById failed:', error);
        throw error;
      }
    });
  });

  describe('getByStudentOnAssignmentId', () => {
    it('should get all files for a student assignment', async () => {
      try {
        const result =
          await fileOnStudentAssignmentRepository.getByStudentOnAssignmentId({
            studentOnAssignmentId: studentOnAssignmentId,
          });
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((f) => f.id === fileId)).toBe(true);
      } catch (error) {
        console.error('getByStudentOnAssignmentId failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of files', async () => {
      try {
        const result = await fileOnStudentAssignmentRepository.findMany({
          where: {
            studentOnAssignmentId: studentOnAssignmentId,
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
    it('should update file content', async () => {
      try {
        const updated = await fileOnStudentAssignmentRepository.update({
          where: {
            id: fileId,
          },
          data: {
            body: 'https://example.com/updated.png',
            name: 'updated.png',
          },
        });

        expect(updated.id).toBe(fileId);
        expect(updated.body).toBe('https://example.com/updated.png');
        expect(updated.name).toBe('updated.png');
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete file on student assignment', async () => {
      try {
        const deleted = await fileOnStudentAssignmentRepository.delete({
          fileOnStudentAssignmentId: fileId,
        });

        expect(deleted.id).toBe(fileId);
        fileId = ''; // ป้องกันการลบซ้ำ
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });

  describe('deleteMany', () => {
    it('should delete all files for a student assignment', async () => {
      try {
        // สร้างไฟล์จำลองเพิ่มขึ้นมาอีก 2 ชิ้น
        const file1 = await fileOnStudentAssignmentRepository.create({
          data: {
            type: 'image/jpeg',
            body: 'https://example.com/test1.jpg',
            size: 888,
            contentType: 'FILE',
            assignmentId: assignmentId,
            subjectId: subjectId,
            schoolId: schoolId,
            studentId: studentId,
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });

        const file2 = await fileOnStudentAssignmentRepository.create({
          data: {
            type: 'image/png',
            body: 'https://example.com/test2.png',
            size: 999,
            contentType: 'FILE',
            assignmentId: assignmentId,
            subjectId: subjectId,
            schoolId: schoolId,
            studentId: studentId,
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });

        // ลบทั้งหมดโดยใช้ studentOnAssignmentId
        await fileOnStudentAssignmentRepository.deleteMany({
          where: {
            studentOnAssignmentId,
          },
        });

        const check = await fileOnStudentAssignmentRepository.findMany({
          where: { studentOnAssignmentId },
        });

        expect(check.length).toBe(0);
      } catch (error) {
        console.error('deleteMany failed:', error);
        throw error;
      }
    });
  });
});
