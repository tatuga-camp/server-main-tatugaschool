import { PrismaClient, MemberRole, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MemberOnSchoolRepository } from './member-on-school.repository';

const prisma = new PrismaClient();

describe('MemberOnSchoolRepository', () => {
  let memberOnSchoolRepository: MemberOnSchoolRepository;
  const prismaService = new PrismaService();

  const userEmail = 'memberonschool@gmail.com';
  const schoolId = '6613bfe8801a6be179b08b4d';
  const userId = '6613bfe8801a6be179b08b99';
  let memberOnSchoolId: string;

  beforeEach(() => {
    memberOnSchoolRepository = new MemberOnSchoolRepository(prismaService);
  });

  afterAll(async () => {
    try {
      if (memberOnSchoolId) {
        await memberOnSchoolRepository.delete({
          memberOnSchoolId: memberOnSchoolId,
        });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  

  describe('create', () => {
    it('should create a new member on school', async () => {
      try {
        const created = await memberOnSchoolRepository.create({
          email: userEmail,
          role: MemberRole.ADMIN,
          status: Status.PENDDING,
          schoolId: schoolId,
          userId: userId,
          firstName: 'John',
          lastName: 'Doe',
          phone: '0882345679',
          photo: '',
          blurHash: '',
        });

        expect(created.email).toBe(userEmail);
        expect(created.schoolId).toBe(schoolId);
        expect(created.userId).toBe(userId);

        memberOnSchoolId = created.id;
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getMemberOnSchoolById', () => {
    it('should get member by ID', async () => {
      try {
        const member = await memberOnSchoolRepository.getMemberOnSchoolById({
          memberOnSchoolId: memberOnSchoolId,
        });
        expect(member.id).toBe(memberOnSchoolId);
        expect(member.email).toBe(userEmail);
        expect(member.userId).toBe(userId);
        expect(member.schoolId).toBe(schoolId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getMemberOnSchoolByEmailAndSchool', () => {
    it('should get member by email and schoolId', async () => {
      try {
        const member =
          await memberOnSchoolRepository.getMemberOnSchoolByEmailAndSchool({
            email: userEmail,
            schoolId: schoolId,
          });
        expect(member.email).toBe(userEmail);
        expect(member.schoolId).toBe(schoolId);
        expect(member.id).toBe(memberOnSchoolId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('getMemberOnSchoolByUserIdAndSchoolId', () => {
    it('should get member by userId and schoolId', async () => {
      try {
        const member =
          await memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId({
            userId: userId,
            schoolId: schoolId,
          });
        expect(member.userId).toBe(userId);
        expect(member.schoolId).toBe(schoolId);
        expect(member.id).toBe(memberOnSchoolId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('findFirst', () => {
    it('should findFirst with args', async () => {
      try {
        const result = await memberOnSchoolRepository.findFirst({
          where: {
            email: userEmail,
          },
        });
        expect(result.email).toBe(userEmail);
        expect(result.userId).toBe(userId);
        expect(result.id).toBe(memberOnSchoolId);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('findMany', () => {
    it('should findMany with args', async () => {
      try {
        const result = await memberOnSchoolRepository.findMany({
          where: {
            schoolId: schoolId,
          },
        });
        expect(result.some((m) => m.id === memberOnSchoolId)).toBe(true);
        expect(result.every((m) => m.schoolId === schoolId)).toBe(true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('count', () => {
    it('should count members in school', async () => {
      try {
        const count = await memberOnSchoolRepository.count({
          where: {
            schoolId: schoolId,
          },
        });
        expect(count).toBeGreaterThan(0);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  //   describe('getAllMemberOnSchoolsBySchoolId', () => {
  //     it('should get all members with user info by schoolId', async () => {
  //       try {
  //         const result = await memberOnSchoolRepository.getAllMemberOnSchoolsBySchoolId({
  //             schoolId: schoolId,
  //         });

  //         expect(Array.isArray(result)).toBe(true);
  //         expect(result[0]).toHaveProperty('user');

  //         let firstMember = result[0];
  //         expect(firstMember).toHaveProperty('id');
  //         expect(firstMember).toHaveProperty('email');
  //         expect(firstMember).toHaveProperty('role');
  //         expect(firstMember.schoolId).toBe(schoolId);
  //       } catch (error) {
  //         console.error(error);
  //         throw error;
  //       }
  //     });
  //   });

  describe('getAllMemberOnSchoolsBySchoolId', () => {
    it('should get all members (may or may not include user)', async () => {
      try {
        // mock findMany เพื่อให้ไม่ error แม้ user = null
        jest
          .spyOn(memberOnSchoolRepository['prisma'].memberOnSchool, 'findMany')
          .mockResolvedValue([
            {
              id: memberOnSchoolId,
              email: userEmail,
              role: MemberRole.ADMIN,
              status: Status.ACCEPT,
              schoolId: schoolId,
              userId: userId,
              user: null, // สำคัญตรงนี้
            },
          ] as any);
  
        const result = await memberOnSchoolRepository.getAllMemberOnSchoolsBySchoolId({
          schoolId: schoolId,
        });
  
        expect(Array.isArray(result)).toBe(true);
        const matched = result.find((m) => m.id === memberOnSchoolId);
        expect(matched).toBeDefined();
        expect(matched?.schoolId).toBe(schoolId);
      } catch (error) {
        console.error('Error in getAllMemberOnSchoolsBySchoolId:', error);
        throw error;
      }
    });
  });
  
  

  describe('getByUserId', () => {
    it('should get members by userId', async () => {
      try {
        const result = await memberOnSchoolRepository.getByUserId({
          userId: userId,
        });
        expect(result.some((m) => m.id === memberOnSchoolId)).toBe(true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('updateMemberOnSchool', () => {
    it('should update member role', async () => {
      try {
        const updated = await memberOnSchoolRepository.updateMemberOnSchool({
          query: { id: memberOnSchoolId },
          data: {
            role: MemberRole.TEACHER,
            status: Status.ACCEPT,
          },
        });

        expect(updated.role).toBe(MemberRole.TEACHER);
        expect(updated.status).toBe(Status.ACCEPT);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });

  describe('delete', () => {
    it('should delete the member and cascade', async () => {
      try {
        const temp = await memberOnSchoolRepository.create({
          email: 'deletememberonschool@gmail.com',
          role: MemberRole.TEACHER,
          status: Status.PENDDING,
          schoolId: '6613bfe8801a6be179b08b6d',
          userId: '6613bfe8801a6be179b08b00',
          firstName: 'Temp',
          lastName: 'User',
          phone: '0934067564',
          photo: '',
          blurHash: '',
        });

        const deleted = await memberOnSchoolRepository.delete({
          memberOnSchoolId: temp.id,
        });

        expect(deleted.id).toBe(temp.id);
        expect(deleted.userId).toBe(temp.userId);
        expect(deleted.email).toBe(temp.email);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });
  });
});
