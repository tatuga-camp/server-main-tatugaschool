import { PrismaService } from '../prisma/prisma.service';
import { SkillOnStudentAssignmentRepository } from './skill-on-student-assignment.repository';

describe('SkillOnStudentAssignmentRepository', () => {
  const prismaService = new PrismaService();
  let skillOnStudentAssignmentRepository: SkillOnStudentAssignmentRepository;

  const skillId = '6644f3e1c8a4df26a6e3f111';
  const studentOnAssignmentId = '6644f3e1c8a4df26a6e3f222';
  const subjectId = '6644f3e1c8a4df26a6e3f333';
  const studentId = '6644f3e1c8a4df26a6e3f444';

  let skillOnStudentAssignmentId: string;

  beforeEach(() => {
    skillOnStudentAssignmentRepository = new SkillOnStudentAssignmentRepository(
      prismaService,
    );
  });

  afterAll(async () => {
    try {
      if (skillOnStudentAssignmentId) {
        await skillOnStudentAssignmentRepository.delete({
          where: {
            id: skillOnStudentAssignmentId,
          },
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('create', () => {
    it('should create a skill-on-student-assignment record', async () => {
      try {
        const created = await skillOnStudentAssignmentRepository.create({
          data: {
            skillId: skillId,
            studentOnAssignmentId: studentOnAssignmentId,
            subjectId: subjectId,
            studentId: studentId,
            weight: 1,
          },
        });

        expect(created.skillId).toBe(skillId);
        expect(created.studentOnAssignmentId).toBe(studentOnAssignmentId);
        expect(created.subjectId).toBe(subjectId);
        expect(created.studentId).toBe(studentId);
        expect(created.weight).toBe(1);
        expect(created.id).toBeDefined();

        skillOnStudentAssignmentId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find by ID', async () => {
      try {
        const found = await skillOnStudentAssignmentRepository.findUnique({
          where: {
            id: skillOnStudentAssignmentId,
          },
        });

        expect(found.id).toBe(skillOnStudentAssignmentId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find first by studentOnAssignmentId', async () => {
      try {
        const result = await skillOnStudentAssignmentRepository.findFirst({
          where: {
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });

        expect(result.studentOnAssignmentId).toBe(studentOnAssignmentId);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return all related skills for a student assignment', async () => {
      try {
        const result = await skillOnStudentAssignmentRepository.findMany({
          where: {
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === skillOnStudentAssignmentId)).toBe(
          true,
        );
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('counts', () => {
    it('should count skills assigned to the student', async () => {
      try {
        const count = await skillOnStudentAssignmentRepository.counts({
          where: {
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });
        expect(count).toBeGreaterThan(0);
      } catch (error) {
        console.error('counts failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update weight', async () => {
      try {
        const updated = await skillOnStudentAssignmentRepository.update({
          where: {
            id: skillOnStudentAssignmentId,
          },
          data: {
            weight: 0.75,
          },
        });

        expect(updated.id).toBe(skillOnStudentAssignmentId);
        expect(updated.weight).toBe(0.75);
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the record', async () => {
      try {
        const deleted = await skillOnStudentAssignmentRepository.delete({
          where: {
            id: skillOnStudentAssignmentId,
          },
        });

        expect(deleted.id).toBe(skillOnStudentAssignmentId);
        skillOnStudentAssignmentId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });

  describe('deleteMany', () => {
    it('should delete all by studentOnAssignmentId', async () => {
      try {
        // สร้างใหม่ก่อนลบ
        await skillOnStudentAssignmentRepository.create({
          data: {
            skillId: skillId,
            studentOnAssignmentId: studentOnAssignmentId,
            subjectId: subjectId,
            studentId: studentId,
            weight: 1,
          },
        });

        const result = await skillOnStudentAssignmentRepository.deleteMany({
          where: {
            studentOnAssignmentId: studentOnAssignmentId,
          },
        });

        expect(result.count).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.error('deleteMany failed:', error);
        throw error;
      }
    });
  });
});
