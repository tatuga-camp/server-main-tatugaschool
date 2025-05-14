import { CareerRepository } from './career.repository';
import { PrismaService } from '../prisma/prisma.service';

const prismaService = new PrismaService();

describe('CareerRepository', () => {
  let careerRepository: CareerRepository;
  let careerId: string;
  let careerTitle: string;

  beforeEach(() => {
    careerRepository = new CareerRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (careerId) {
        await prismaService.skillOnCareer.deleteMany({ where: { careerId } });
        await prismaService.career.delete({ where: { id: careerId } });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('create', () => {
    it('should create a career', async () => {
      try {
        const created = await careerRepository.create({
          data: {
            title: 'วิศวกรซอฟต์แวร์',
            description: 'เขียนโปรแกรม พัฒนาซอฟต์แวร์',
            keywords: 'software,developer,engineer',
          },
        });

        expect(created.title).toBe('วิศวกรซอฟต์แวร์');
        expect(created.description).toBe('เขียนโปรแกรม พัฒนาซอฟต์แวร์');
        expect(created.keywords).toBe('software,developer,engineer');

        careerId = created.id;
        careerTitle = created.title;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find career by id', async () => {
      try {
        const found = await careerRepository.findUnique({
          where: {
            id: careerId,
          },
        });
        expect(found.id).toBe(careerId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return careers with title filter', async () => {
      try {
        const result = await careerRepository.findMany({
          where: {
            title: careerTitle,
          },
        });
        expect(Array.isArray(result)).toBe(true);
        expect(result.some((c) => c.id === careerId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('counts', () => {
    it('should count careers by title', async () => {
      try {
        const count = await careerRepository.counts({
          where: {
            title: careerTitle,
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
    it('should update career title', async () => {
      try {
        const updated = await careerRepository.update({
          where: {
            id: careerId,
          },
          data: {
            title: 'โปรแกรมเมอร์',
          },
        });

        expect(updated.id).toBe(careerId);
        expect(updated.title).toBe('โปรแกรมเมอร์');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete career and return message', async () => {
      try {
        const result = await careerRepository.delete({
          where: {
            id: careerId,
          },
        });
        expect(result.message).toBe('Career deleted successfully');
        careerId = ''; // ป้องกันลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
