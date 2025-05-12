import { CareerRepository } from './career.repository';
import { PrismaService } from '../prisma/prisma.service';

const prisma = new PrismaService();

describe('CareerRepository', () => {
  let careerRepository: CareerRepository;
  let careerId: string;
  let careerTitle: string;

  beforeEach(() => {
    careerRepository = new CareerRepository(prisma);
  });

  afterAll(async () => {
    try {
      if (careerId) {
        await prisma.career.delete({ where: { id: careerId } });
        await prisma.skillOnCareer.deleteMany({ where: { careerId } });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

describe('create', () => {
  it('should create a career', async () => {
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
  });
});


  describe('findUnique', () => {
    it('should find career by id', async () => {
      const found = await careerRepository.findUnique({
        where: {
          id: careerId,
        },
      });
      expect(found.id).toBe(careerId);
    });
  });

  describe('findMany', () => {
    it('should return careers with title filter', async () => {
      const result = await careerRepository.findMany({
        where: {
          title: careerTitle,
        },
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.some((c) => c.id === careerId)).toBe(true);
    });
  });

  describe('counts', () => {
    it('should count careers by title', async () => {
      const count = await careerRepository.counts({
        where: {
          title: careerTitle,
        },
      });
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should update career title', async () => {
      const updated = await careerRepository.update({
        where: { 
            id: careerId 
        },
        data: { 
            title: 'โปรแกรมเมอร์' 
        },
      });

      expect(updated.id).toBe(careerId);
      expect(updated.title).toBe('โปรแกรมเมอร์');
    });
  });

  describe('delete', () => {
    it('should delete career and return message', async () => {
      const result = await careerRepository.delete({
        where: { 
            id: careerId 
        },
      });
      expect(result.message).toBe('Career deleted successfully');
      careerId = ''; // ป้องกันลบซ้ำใน afterAll
    });
  });
});
