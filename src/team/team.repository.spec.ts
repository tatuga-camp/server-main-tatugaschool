import { PrismaService } from '../prisma/prisma.service';
import { TeamRepository } from './team.repository';

describe('TeamRepository', () => {
  const prismaService = new PrismaService();
  let teamRepository: TeamRepository;
  let teamId: string;

  const schoolId = '66500e4ea1b3f5370ac122f3';

  beforeEach(() => {
    teamRepository = new TeamRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (teamId) {
        await teamRepository.delete({
          where: {
            id: teamId,
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
    it('should create a team', async () => {
      try {
        const created = await teamRepository.create({
          data: {
            title: 'ทีมวิจัยฟิสิกส์',
            description: 'กลุ่มพัฒนาองค์ความรู้ด้านฟิสิกส์',
            icon: 'https://example.com/icon.png',
            schoolId: schoolId,
          },
        });

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.title).toBe('ทีมวิจัยฟิสิกส์');
        expect(created.description).toBe('กลุ่มพัฒนาองค์ความรู้ด้านฟิสิกส์');
        expect(created.icon).toBe('https://example.com/icon.png');
        expect(created.schoolId).toBe(schoolId);

        teamId = created.id;
      } catch (error) {
        console.error('create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should find team by id', async () => {
      try {
        const result = await teamRepository.findUnique({
          where: {
            id: teamId,
          },
        });

        expect(result).toBeDefined();
        expect(result?.id).toBe(teamId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should find many teams by schoolId', async () => {
      try {
        const result = await teamRepository.findMany({
          where: {
            schoolId: schoolId,
          },
        });

        expect(Array.isArray(result)).toBe(true);
        expect(result.some((r) => r.id === teamId)).toBe(true);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('counts', () => {
    it('should count teams in school', async () => {
      try {
        const count = await teamRepository.counts({
          where: {
            schoolId: schoolId,
          },
        });

        expect(count).toBeGreaterThanOrEqual(1);
      } catch (error) {
        console.error('counts failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update team title and description', async () => {
      try {
        const updated = await teamRepository.update({
          where: {
            id: teamId,
          },
          data: {
            title: 'ทีมคณิตศาสตร์',
            description: 'กลุ่มงานคณิตขั้นสูง',
          },
        });

        expect(updated.id).toBe(teamId);
        expect(updated.title).toBe('ทีมคณิตศาสตร์');
        expect(updated.description).toBe('กลุ่มงานคณิตขั้นสูง');
      } catch (error) {
        console.error('update failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the team', async () => {
      try {
        const result = await teamRepository.delete({
          where: {
            id: teamId,
          },
        });

        expect(result.id).toBe(teamId);
        teamId = ''; // เพื่อไม่ให้ลบซ้ำใน afterAll
      } catch (error) {
        console.error('delete failed:', error);
        throw error;
      }
    });
  });
});
