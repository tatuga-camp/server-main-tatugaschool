import { PrismaClient, MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MemberOnTeamRepository } from './member-on-team.repository';

const prisma = new PrismaClient();

describe('MemberOnTeamRepository', () => {
  const prismaService = new PrismaService();
  let memberOnTeamRepository: MemberOnTeamRepository;

  let memberOnTeamId: string;
  const teamId = '6613bfe8801a6be179b08aaa';
  const userId = '6613bfe8801a6be179b08bbb';
  const schoolId = '6613bfe8801a6be179b08ccc';

  beforeEach(() => {
    memberOnTeamRepository = new MemberOnTeamRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (memberOnTeamId) {
        await memberOnTeamRepository.delete({
          where: {
            id: memberOnTeamId,
          },
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('create', () => {
    it('should create a member on team', async () => {
      try {
        const created = await memberOnTeamRepository.create({
          data: {
            userId: userId,
            teamId: teamId,
            role: MemberRole.TEACHER,
            schoolId: schoolId,
            status: 'ACCEPT',
            memberOnSchoolId: '6613bfe8801a6be179b08ddd',
            firstName: 'Test',
            lastName: 'User',
            email: 'user@example.com',
            phone: '0999999999',
            photo: '',
            blurHash: '',
          },
        });

        expect(created.teamId).toBe(teamId);
        expect(created.userId).toBe(userId);

        memberOnTeamId = created.id;
      } catch (error) {
        console.error('Create failed:', error);
        throw error;
      }
    });
  });

  describe('findUnique', () => {
    it('should return member by id', async () => {
      try {
        const result = await memberOnTeamRepository.findUnique({
          where: { id: memberOnTeamId },
        });
        expect(result?.id).toBe(memberOnTeamId);
      } catch (error) {
        console.error('findUnique failed:', error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should return member with userId and teamId', async () => {
      try {
        const result = await memberOnTeamRepository.findFirst({
          where: { userId, teamId },
        });
        expect(result?.teamId).toBe(teamId);
      } catch (error) {
        console.error('findFirst failed:', error);
        throw error;
      }
    });
  });

  describe('update', () => {
    it('should update role', async () => {
      try {
        const updated = await memberOnTeamRepository.update({
          where: { id: memberOnTeamId },
          data: { role: MemberRole.TEACHER },
        });
        expect(updated.role).toBe(MemberRole.TEACHER);
      } catch (error) {
        console.error('Update failed:', error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should return list of members by teamId', async () => {
      try {
        const result = await memberOnTeamRepository.findMany({
          where: { teamId },
        });
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].teamId).toBe(teamId);
      } catch (error) {
        console.error('findMany failed:', error);
        throw error;
      }
    });
  });

  describe('counts', () => {
    it('should count members in team', async () => {
      try {
        const count = await memberOnTeamRepository.counts({
          where: { teamId },
        });
        expect(count).toBeGreaterThan(0);
      } catch (error) {
        console.error('Count failed:', error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete member on team', async () => {
      try {
        const deleted = await memberOnTeamRepository.delete({
          where: { id: memberOnTeamId },
        });
        expect(deleted.id).toBe(memberOnTeamId);
      } catch (error) {
        console.error('Delete failed:', error);
        throw error;
      }
    });
  });
});
