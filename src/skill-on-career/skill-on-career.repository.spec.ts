import { PrismaService } from '../prisma/prisma.service';
import { SkillOnCareerRepository } from './skill-on-career.repository';

describe('SkillOnCareerRepository', () => {
  const prismaService = new PrismaService();
  let skillOnCareerRepository: SkillOnCareerRepository;

  const skillId = '6644f3e1c8a4df26a6e3f111';
  const careerId = '6644f3e1c8a4df26a6e3f222';
  let skillOnCareerId: string;

  beforeEach(() => {
    skillOnCareerRepository = new SkillOnCareerRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (skillOnCareerId) {
        await skillOnCareerRepository.delete({ 
            where: { 
                id: skillOnCareerId 
            } 
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      await prismaService.$disconnect();
    }
  });

  describe('create', () => {
    it('should create a skill-on-career record', async () => {
      try {
        const created = await skillOnCareerRepository.create({
          data: {
            skillId: skillId,
            careerId: careerId,
            weight: 0.85,
          },
        });

        expect(created.skillId).toBe(skillId);
        expect(created.careerId).toBe(careerId);
        expect(created.weight).toBeCloseTo(0.85);

        skillOnCareerId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should return skill-on-career by ID', async () => {
      try {
        const found = await skillOnCareerRepository.findUnique({
          where: { 
            id: skillOnCareerId 
        },
        });

        expect(found.id).toBe(skillOnCareerId);
        expect(found.careerId).toBe(careerId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should find first matching record', async () => {
      try {
        const found = await skillOnCareerRepository.findFirst({
          where: { 
            careerId: careerId 
        },
        });

        expect(found.careerId).toBe(careerId);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return all skill-on-career records with careerId', async () => {
      try {
        const result = await skillOnCareerRepository.findMany({
          where: { 
            careerId: careerId 
        },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === skillOnCareerId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('counts', () => {
    it('should count how many skills are linked to this career', async () => {
      try {
        const count = await skillOnCareerRepository.counts({
          where: { 
            careerId: careerId 
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
    it('should update the weight of skill-on-career', async () => {
      try {
        const updated = await skillOnCareerRepository.update({
          where: { 
            id: skillOnCareerId 
        },
          data: {
            weight: 0.7,
          },
        });

        expect(updated.id).toBe(skillOnCareerId);
        expect(updated.weight).toBeCloseTo(0.7);
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the skill-on-career', async () => {
      try {
        const result = await skillOnCareerRepository.delete({
          where: { 
            id: skillOnCareerId 
        },
        });

        expect(result.message).toBe('SkillOnCareer deleted successfully');
        skillOnCareerId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
