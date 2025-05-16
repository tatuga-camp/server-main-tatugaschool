import { PrismaService } from '../prisma/prisma.service';
import { SkillOnAssignmentRepository } from './skill-on-assignment.repository';

describe('SkillOnAssignmentRepository', () => {
  const prismaService = new PrismaService();
  let skillOnAssignmentRepository: SkillOnAssignmentRepository;

  const skillId = '6644f3e1c8a4df26a6e3e111';
  const assignmentId = '6644f3e1c8a4df26a6e3e222';
  const subjectId = '6644f3e1c8a4df26a6e3e333';

  let skillOnAssignmentId: string;

  beforeEach(() => {
    skillOnAssignmentRepository = new SkillOnAssignmentRepository(
      prismaService,
    );
  });

  afterAll(async () => {
    try {
      if (skillOnAssignmentId) {
        await skillOnAssignmentRepository.delete({
          id: skillOnAssignmentId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('create', () => {
    it('should create a skill-on-assignment record', async () => {
      try {
        const created = await skillOnAssignmentRepository.create({
          skillId: skillId,
          assignmentId: assignmentId,
          subjectId: subjectId,
        });

        expect(created.skillId).toBe(skillId);
        expect(created.assignmentId).toBe(assignmentId);
        expect(created.subjectId).toBe(subjectId);

        skillOnAssignmentId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should find skill-on-assignment by ID', async () => {
      try {
        const found = await skillOnAssignmentRepository.getById({
          id: skillOnAssignmentId,
        });

        expect(found?.id).toBe(skillOnAssignmentId);
        expect(found?.skillId).toBe(skillId);
        expect(found?.assignmentId).toBe(assignmentId);
      } catch (error) {
        console.error('getById failed:', error);
        throw error;
      }
    });
  });

  describe('getByAssignmentId', () => {
    it('should return skill-on-assignment by assignmentId', async () => {
      try {
        const result = await skillOnAssignmentRepository.getByAssignmentId({
          assignmentId: assignmentId,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === skillOnAssignmentId)).toBe(true);
      } catch (error) {
        console.error('getByAssignmentId failed:', error);
        throw error;
      }
    });
  });

  describe('getBySkillId', () => {
    it('should return skill-on-assignment by skillId', async () => {
      try {
        const result = await skillOnAssignmentRepository.getBySkillId({
          skillId: skillId,
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === skillOnAssignmentId)).toBe(true);
      } catch (error) {
        console.error('getBySkillId failed:', error);
        throw error;
      }
    });
  });

  describe('getBySubjectId', () => {
    it('should return skill-on-assignment by subjectId', async () => {
      try {
        const result = await skillOnAssignmentRepository.getBySubjectId({
          subjectId: subjectId,
        });

        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.error('getBySubjectId failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete skill-on-assignment by ID', async () => {
      try {
        const result = await skillOnAssignmentRepository.delete({
          id: skillOnAssignmentId,
        });

        expect(result.message).toBe('Skill on assignment deleted successfully');
        skillOnAssignmentId = ''; // ป้องกันลบซ้ำ
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });

  describe('deleteByAssignmentId', () => {
    it('should delete all skills on the assignment', async () => {
      try {
        // สร้างก่อนลบเพื่อทดสอบ
        const created = await skillOnAssignmentRepository.create({
          skillId: skillId,
          assignmentId: assignmentId,
          subjectId: subjectId,
        });

        const result = await skillOnAssignmentRepository.deleteByAssignmentId({
          assignmentId: assignmentId,
        });

        expect(result.message).toBe('Skill on assignment deleted successfully');
      } catch (error) {
        console.error('deleteByAssignmentId failed:', error);
        throw error;
      }
    });
  });
});
