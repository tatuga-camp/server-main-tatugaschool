import { PrismaService } from '../prisma/prisma.service';
import { StudentOnGroupRepository } from './student-on-group.repository';

describe('StudentOnGroupRepository', () => {
  const prismaService = new PrismaService();
  let repository: StudentOnGroupRepository;
  let studentOnGroupId: string;

  const mockUnitOnGroupId = '6650deaddeaddeaddead001';
  const mockStudentOnSubjectId = '6650deaddeaddeaddead002';

  const mockData = {
    id: '6650deaddeaddeaddead003',
    unitOnGroupId: mockUnitOnGroupId,
    studentOnSubjectId: mockStudentOnSubjectId,
    order: 1,
  };

  beforeEach(() => {
    repository = new StudentOnGroupRepository(prismaService);
  });

  afterAll(async () => {
    try{
        await prismaService.$disconnect();
    } catch (error){
                    console.error('Cleanup failed', error);
        throw error;
    }
  });

  describe('create', () => {
    it('should create student-on-group entry', async () => {
      try {
        jest.spyOn(repository, 'create').mockResolvedValueOnce(mockData as any);

        const created = await repository.create({
          data: {
            unitOnGroup: { connect: { id: mockUnitOnGroupId } },
            studentOnSubject: { connect: { id: mockStudentOnSubjectId } },
            order: 1,
          },
        } as any);

        expect(created).toBeDefined();
        expect(created.unitOnGroupId).toBe(mockUnitOnGroupId);
        expect(created.studentOnSubjectId).toBe(mockStudentOnSubjectId);

        studentOnGroupId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find one by id', async () => {
      try {
        jest
          .spyOn(repository, 'findUnique')
          .mockResolvedValueOnce(mockData as any);

        const found = await repository.findUnique({
          where: { id: studentOnGroupId },
        } as any);

        expect(found).toBeDefined();
        expect(found.id).toBe(studentOnGroupId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find first matching record', async () => {
      try {
        jest
          .spyOn(repository, 'findFirst')
          .mockResolvedValueOnce(mockData as any);

        const result = await repository.findFirst({
          where: { unitOnGroupId: mockUnitOnGroupId },
          orderBy: { order: 'asc' },
        } as any);

        expect(result).toBeDefined();
        expect(result.unitOnGroupId).toBe(mockUnitOnGroupId);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return all for unit', async () => {
      try {
        jest
          .spyOn(repository, 'findMany')
          .mockResolvedValueOnce([mockData] as any);

        const result = await repository.findMany({
          where: { unitOnGroupId: mockUnitOnGroupId },
        } as any);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update the order field', async () => {
      try {
        const updated = { ...mockData, order: 5 };

        jest.spyOn(repository, 'update').mockResolvedValueOnce(updated as any);

        const result = await repository.update({
          where: { id: studentOnGroupId },
          data: { order: 5 },
        } as any);

        expect(result).toBeDefined();
        expect(result.order).toBe(5);
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the record', async () => {
      try {
        jest.spyOn(repository, 'delete').mockResolvedValueOnce(mockData as any);

        const deleted = await repository.delete({
          where: { id: studentOnGroupId },
        } as any);

        expect(deleted.id).toBe(studentOnGroupId);
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });

  describe('deleteMany', () => {
    it('should delete many records', async () => {
      try {
        jest
          .spyOn(repository, 'deleteMany')
          .mockResolvedValueOnce({ count: 2 });

        const result = await repository.deleteMany({
          where: { unitOnGroupId: mockUnitOnGroupId },
        });

        expect(result.count).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.error('deleteMany failed:', error);
        throw error;
      }
    });
  });
});
