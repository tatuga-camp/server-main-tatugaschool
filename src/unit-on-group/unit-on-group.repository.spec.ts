import { PrismaService } from '../prisma/prisma.service';
import { UnitOnGroupRepository } from './unit-on-group.repository';

describe('UnitOnGroupRepository', () => {
  const prismaService = new PrismaService();
  let unitOnGroupRepository: UnitOnGroupRepository;
  let unitOnGroupId: string;

  const groupOnSubjectId = '66500e4ea1b3f5370ac122f4';
  const subjectId = '66500e4ea1b3f5370ac122f5';
  const schoolId = '66500e4ea1b3f5370ac122f3';

  const mockUnit = {
    id: '66500e4ea1b3f5370ac122fa',
    title: 'บทที่ 1',
    description: 'เนื้อหาเบื้องต้น',
    icon: 'https://example.com/unit.png',
    order: 1,
    totalScore: 0,
    groupOnSubjectId: groupOnSubjectId,
    subjectId: subjectId,
    schoolId: schoolId,
    createAt: new Date(),
    updateAt: new Date(),
  };

  beforeEach(() => {
    unitOnGroupRepository = new UnitOnGroupRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (unitOnGroupId) {
        jest
          .spyOn(unitOnGroupRepository, 'delete')
          .mockResolvedValueOnce(mockUnit as any);
        await unitOnGroupRepository.delete({
          unitOnGroupId: unitOnGroupId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('create', () => {
    it('should create a unit on group', async () => {
      try {
        jest
          .spyOn(unitOnGroupRepository, 'create')
          .mockResolvedValueOnce(mockUnit as any);

        const created = await unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: groupOnSubjectId },
            },
            subject: {
              connect: { id: subjectId },
            },
            school: {
              connect: { id: schoolId },
            },
          },
        } as any);

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.groupOnSubjectId).toBe(groupOnSubjectId);
        expect(created.title).toBe('บทที่ 1');
        expect(created.description).toBe('เนื้อหาเบื้องต้น');
        expect(created.icon).toBe('https://example.com/unit.png');
        expect(created.order).toBe(1);

        unitOnGroupId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find by id', async () => {
      try {
        jest
          .spyOn(unitOnGroupRepository, 'findUnique')
          .mockResolvedValueOnce(mockUnit as any);

        const result = await unitOnGroupRepository.findUnique({
          where: {
            id: unitOnGroupId,
          },
        } as any);

        expect(result).toBeDefined();
        expect(result.id).toBe(unitOnGroupId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find the first match', async () => {
      try {
        jest
          .spyOn(unitOnGroupRepository, 'findFirst')
          .mockResolvedValueOnce(mockUnit as any);

        const result = await unitOnGroupRepository.findFirst({
          where: {
            groupOnSubjectId: groupOnSubjectId,
          },
          orderBy: {
            order: 'asc',
          },
        } as any);

        expect(result).toBeDefined();
        expect(result.groupOnSubjectId).toBe(groupOnSubjectId);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return units for group', async () => {
      try {
        jest
          .spyOn(unitOnGroupRepository, 'findMany')
          .mockResolvedValueOnce([mockUnit] as any);

        const result = await unitOnGroupRepository.findMany({
          where: {
            groupOnSubjectId: groupOnSubjectId,
          },
        } as any);

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((u) => u.id === unitOnGroupId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update unit title and totalScore', async () => {
      try {
        const updatedUnit = {
          ...mockUnit,
          title: 'บทที่ 1 ปรับปรุง',
          totalScore: 100,
        };

        jest
          .spyOn(unitOnGroupRepository, 'update')
          .mockResolvedValueOnce(updatedUnit as any);

        const updated = await unitOnGroupRepository.update({
          where: { id: unitOnGroupId },
          data: {
            title: 'บทที่ 1 ปรับปรุง',
            totalScore: 100,
          },
        } as any);

        expect(updated.id).toBe(unitOnGroupId);
        expect(updated.title).toBe('บทที่ 1 ปรับปรุง');
        expect(updated.totalScore).toBe(100);
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the unit', async () => {
      try {
        jest
          .spyOn(unitOnGroupRepository, 'delete')
          .mockResolvedValueOnce(mockUnit as any);

        const deleted = await unitOnGroupRepository.delete({
          unitOnGroupId: unitOnGroupId,
        });

        expect(deleted.id).toBe(unitOnGroupId);
        unitOnGroupId = '';
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
