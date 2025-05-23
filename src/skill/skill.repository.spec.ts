import { PrismaService } from '../prisma/prisma.service';
import { SkillRepository } from './skill.repository';

describe('SkillRepository', () => {
  const prismaService = new PrismaService();
  let skillRepository: SkillRepository;
  const vector = [0.1, 0.2, 0.3, 0.4];
  let skillId: string;

  beforeEach(() => {
    skillRepository = new SkillRepository(prismaService);
  });

  describe('create', () => {
    it('should create a skill', async () => {
      try {
        const created = await skillRepository.create({
          title: 'React Developer',
          description: 'สามารถพัฒนาเว็บด้วย React ได้',
          keywords: 'react,javascript,frontend',
          vector: vector,
        });

        expect(created.title).toBe('React Developer');
        expect(created.description).toBe('สามารถพัฒนาเว็บด้วย React ได้');
        expect(created.keywords).toBe('react,javascript,frontend');
        expect(Array.isArray((created as any).vector)).toBe(true);
        expect((created as any).vector).toEqual(vector); // ตรวจสอบค่าทั้ง array

        skillId = created.id;
      } catch (error) {
        console.error('Create skill failed:', error);
        throw error;
      }
    });
  });

  describe('findById', () => {
    it('should find skill by ID', async () => {
      try {
        const found = await skillRepository.findById({
          skillId: skillId,
        });

        expect(found.id).toBe(skillId);
        expect(found.title).toBe('React Developer');
      } catch (error) {
        console.error('findById failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return skills by condition', async () => {
      try {
        const result = await skillRepository.findMany({
          where: {
            title: 'React Developer',
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === skillId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('findAll', () => {
    it('should return all skills', async () => {
      try {
        const result = await skillRepository.findAll();
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((s) => s.id === skillId)).toBe(true);
      } catch (error) {
        console.error('findAll failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update skill fields', async () => {
      try {
        const updated = await skillRepository.update({
          query: {
            skillId: skillId,
          },
          data: {
            title: 'Fullstack Developer',
            description: 'พัฒนาเว็บทั้ง Frontend และ Backend',
            keywords: 'nodejs,react,typescript',
          },
        });

        expect(updated.id).toBe(skillId);
        expect(updated.title).toBe('Fullstack Developer');
        expect(updated.description).toBe('พัฒนาเว็บทั้ง Frontend และ Backend');
        expect(updated.keywords).toBe('nodejs,react,typescript');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete skill and return message', async () => {
      try {
        const result = await skillRepository.delete({
          skillId: skillId,
        });

        expect(result.message).toBe('Skill deleted successfully');
        skillId = ''; // ป้องกันลบซ้ำ
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
