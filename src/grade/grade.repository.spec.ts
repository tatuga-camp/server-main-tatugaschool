import { GradeRepository } from './grade.repository';
import { PrismaService } from '../prisma/prisma.service';

const prismaService = new PrismaService();

describe('GradeRepository', () => {
  let gradeRepository: GradeRepository;
  let gradeRangeId: string;
  const subjectId = '6613bfe8801a6be179b07777';
  const schoolId = '6613bfe8801a6be179b09999';

  beforeEach(async () => {
    gradeRepository = new GradeRepository(prismaService);
  });

  describe('create', () => {
    it('should create grade range from A to F', async () => {
      try {
        const created = await gradeRepository.create({
          data: {
            subjectId: subjectId,
            schoolId: schoolId,
            gradeRules: [
              { min: 80, max: 100, grade: 'A' },
              { min: 70, max: 79, grade: 'B' },
              { min: 60, max: 69, grade: 'C' },
              { min: 50, max: 59, grade: 'D' },
              { min: 0, max: 49, grade: 'F' },
            ],
          },
        });

        expect(created.id).toBeDefined();
        expect(created.subjectId).toBe(subjectId);
        expect(created.schoolId).toBe(schoolId);
        expect(Array.isArray(created.gradeRules)).toBe(true);
        expect(created.gradeRules[0].grade).toBe('A');

        gradeRangeId = created.id;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find grade range by id', async () => {
      try {
        const found = await gradeRepository.findUnique({
          where: {
            id: gradeRangeId,
          },
        });
        expect(found).toBeDefined();
        expect(found.id).toBe(gradeRangeId);
        expect(found.subjectId).toBe(subjectId);
        expect(found.schoolId).toBe(schoolId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return grade ranges for subject', async () => {
      try {
        const result = await gradeRepository.findMany({
          where: {
            subjectId: subjectId,
          },
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((g) => g.id === gradeRangeId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update gradeRules successfully', async () => {
      try {
        const updated = await gradeRepository.update({
          where: {
            id: gradeRangeId,
          },
          data: {
            gradeRules: [
              { min: 80, max: 100, grade: '4' },
              { min: 75, max: 79, grade: '3.5' },
              { min: 70, max: 74, grade: '3' },
              { min: 65, max: 69, grade: '2.5' },
              { min: 60, max: 64, grade: '2' },
              { min: 55, max: 59, grade: '1.5' },
              { min: 50, max: 54, grade: '1' },
              { min: 0, max: 49, grade: '0' },
            ],
          },
        });

        expect(updated.id).toBe(gradeRangeId);
        expect(updated.gradeRules[0].grade).toBe('4');
        expect(updated.gradeRules[7].grade).toBe('0');
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the grade range', async () => {
      try {
        const deleted = await gradeRepository.delete({
          where: { id: gradeRangeId },
        });
        expect(deleted.id).toBe(gradeRangeId);
        gradeRangeId = '';
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });
});
