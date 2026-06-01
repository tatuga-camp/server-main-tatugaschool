import { NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { FileOnStudentAssignmentRepository } from './file-on-student-assignment.repository';

describe('FileOnStudentAssignmentRepository.delete (concurrent / double delete)', () => {
  let repository: FileOnStudentAssignmentRepository;

  const mockPrisma = {
    fileOnStudentAssignment: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockStorageService = {
    DeleteFileOnStorage: jest.fn(),
  };

  beforeEach(() => {
    repository = new FileOnStudentAssignmentRepository(
      mockPrisma as any,
      mockStorageService as any,
    );
    // Silence the expected error log noise during the test.
    jest.spyOn(repository.logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Race window B: the record exists at findUnique but is gone by the actual
  // delete() — Prisma throws P2025. This must surface as a 404, not a 500.
  it('throws NotFoundException (not 500) when delete hits P2025', async () => {
    mockPrisma.fileOnStudentAssignment.findUnique.mockResolvedValue({
      id: 'f1',
      contentType: 'TEXT',
      type: 'text',
      body: 'hello',
      subjectId: 's1',
    });
    mockPrisma.fileOnStudentAssignment.delete.mockRejectedValue(
      new PrismaClientKnownRequestError('No record was found for a delete.', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(
      repository.delete({ fileOnStudentAssignmentId: 'f1' }),
    ).rejects.toThrow(NotFoundException);
  });

  // Race window A: the record is already gone before findUnique runs, so
  // findUnique returns null. This must be a clean 404, not a TypeError -> 500.
  it('throws NotFoundException (not TypeError) when findUnique returns null', async () => {
    mockPrisma.fileOnStudentAssignment.findUnique.mockResolvedValue(null);

    await expect(
      repository.delete({ fileOnStudentAssignmentId: 'gone' }),
    ).rejects.toThrow(NotFoundException);

    expect(mockPrisma.fileOnStudentAssignment.delete).not.toHaveBeenCalled();
  });
});
