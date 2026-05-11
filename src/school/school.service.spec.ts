import { Test, TestingModule } from '@nestjs/testing';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StorageService } from '../storage/storage.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UsersService } from '../users/users.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('SchoolService', () => {
  let service: SchoolService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
  };

  const mockStripeService = {
    customers: { create: jest.fn() },
    UpdateCustomer: jest.fn(),
  };

  const mockMemberOnSchoolService = {
    memberOnSchoolRepository: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    validateAccess: jest.fn(),
  };

  const mockSubjectService = {
    subjectRepository: {
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockClassService = {
    classRepository: {
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUsersService = {
    userRepository: {
      update: jest.fn(),
      findById: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: MemberOnSchoolService, useValue: mockMemberOnSchoolService },
        { provide: StorageService, useValue: {} },
        { provide: SubjectService, useValue: mockSubjectService },
        { provide: ClassService, useValue: mockClassService },
        { provide: SubscriptionService, useValue: {} },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);

    // Mock internal repository
    service.schoolRepository = {
      findMany: jest.fn(),
      getSchoolById: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSchools', () => {
    it('should return schools the user is a member of', async () => {
      mockMemberOnSchoolService.memberOnSchoolRepository.findMany.mockResolvedValue(
        [{ schoolId: 'sch1' }],
      );
      (service.schoolRepository.findMany as jest.Mock).mockResolvedValue([
        { id: 'sch1' },
      ]);

      const result = await service.getSchools({ id: 'u1' } as any);

      expect(result).toEqual([{ id: 'sch1' }]);
    });
  });

  describe('getSchoolById', () => {
    it('should return school details with stats', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        isDeleted: false,
        billingManagerId: 'u1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'Billing Manger',
      });
      mockClassService.classRepository.count.mockResolvedValue(5);
      mockSubjectService.subjectRepository.count.mockResolvedValue(3);
      mockMemberOnSchoolService.memberOnSchoolRepository.count.mockResolvedValue(
        10,
      );

      const result = await service.getSchoolById({ schoolId: 'sch1' }, {
        id: 'u2',
      } as any);

      expect(result.totalClass).toBe(5);
      expect(result.totalSubject).toBe(3);
      expect(result.totalTeacher).toBe(10);
    });

    it('should throw NotFoundException if school is deleted', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        isDeleted: true,
      });

      await expect(
        service.getSchoolById({ schoolId: 'sch1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSchool', () => {
    it('should create school and initial member', async () => {
      mockMemberOnSchoolService.memberOnSchoolRepository.findMany.mockResolvedValue(
        [],
      );
      mockStripeService.customers.create.mockResolvedValue({ id: 'cus_123' });
      (service.schoolRepository.create as jest.Mock).mockResolvedValue({
        id: 'sch1',
      });

      const result = await service.createSchool(
        { title: 'New School', address: '123' } as any,
        { id: 'u1', email: 'test@example.com' } as any,
      );

      expect(mockStripeService.customers.create).toHaveBeenCalled();
      expect(service.schoolRepository.create).toHaveBeenCalled();
      expect(mockUsersService.userRepository.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { favoritSchool: 'sch1' },
      });
      expect(
        mockMemberOnSchoolService.memberOnSchoolRepository.create,
      ).toHaveBeenCalled();
      expect(result.id).toBe('sch1');
    });
  });

  describe('ValidateLimit', () => {
    it('should throw ForbiddenException if target exceeds limit', async () => {
      const mockSchool = { limitClassNumber: 5 } as any;

      await expect(
        service.ValidateLimit(mockSchool, 'classes', 6),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not throw if within limit', async () => {
      const mockSchool = { limitClassNumber: 5 } as any;

      await expect(
        service.ValidateLimit(mockSchool, 'classes', 3),
      ).resolves.toBeUndefined();
    });
  });

  describe('upgradePlanBasic', () => {
    it('should upgrade plan to basic and unlock features', async () => {
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        plan: 'BASIC',
      });
      jest.spyOn(service, 'unlockFeatures').mockResolvedValue(undefined);

      const result = await service.upgradePlanBasic(
        'sch1',
        new Date(),
        'price1',
        'sub1',
      );

      expect(service.schoolRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'BASIC',
            limitClassNumber: 10,
          }),
        }),
      );
      expect(service.unlockFeatures).toHaveBeenCalled();
      expect(result.plan).toBe('BASIC');
    });
  });

  describe('upgradePlanPremium', () => {
    it('should upgrade plan to premium and unlock features', async () => {
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        plan: 'PREMIUM',
        limitSubjectNumber: 30,
        limitClassNumber: 20,
      });
      jest.spyOn(service, 'unlockFeatures').mockResolvedValue(undefined);

      const result = await service.upgradePlanPremium(
        'sch1',
        new Date(),
        'price1',
        'sub1',
      );

      expect(service.schoolRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'PREMIUM',
            limitClassNumber: 20,
          }),
        }),
      );
      expect(service.unlockFeatures).toHaveBeenCalled();
      expect(result.plan).toBe('PREMIUM');
    });
  });

  describe('upgradePlanEnterprise', () => {
    it('should upgrade plan to enterprise and unlock features', async () => {
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        plan: 'ENTERPRISE',
      });
      jest.spyOn(service, 'unlockFeatures').mockResolvedValue(undefined);

      const result = await service.upgradePlanEnterprise(
        'sch1',
        new Date(),
        'price1',
        'sub1',
        5,
      );

      expect(service.schoolRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'ENTERPRISE',
            limitSchoolMember: 5,
          }),
        }),
      );
      expect(service.unlockFeatures).toHaveBeenCalled();
      expect(result.plan).toBe('ENTERPRISE');
    });
  });

  describe('unlockFeatures', () => {
    it('should unlock limited features and lock others', async () => {
      const mockSchool = {
        id: 'sch1',
        limitSubjectNumber: 1,
        limitClassNumber: 1,
      } as any;
      mockSubjectService.subjectRepository.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
      ]);
      mockClassService.classRepository.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
      ]);

      mockSubjectService.subjectRepository.update.mockResolvedValue({});
      mockClassService.classRepository.update.mockResolvedValue({});

      await service.unlockFeatures(mockSchool);

      // s1 locked (index 0), s2 unlocked (index 1)
      expect(mockSubjectService.subjectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: { isLocked: true },
        }),
      );
      expect(mockSubjectService.subjectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's2' },
          data: { isLocked: false },
        }),
      );

      // c1 locked (index 0), c2 unlocked (index 1)
      expect(mockClassService.classRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: { isLocked: true },
        }),
      );
      expect(mockClassService.classRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c2' },
          data: { isLocked: false },
        }),
      );
    });
  });

  describe('upgradePlanFree', () => {
    it('should downgrade plan to free and lock over-limit features', async () => {
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        plan: 'FREE',
      });

      // 4 subjects, 4 classes. limit is 3, so index 3 (4th item) will be locked
      mockSubjectService.subjectRepository.findMany.mockResolvedValue([
        { id: 's1' },
        { id: 's2' },
        { id: 's3' },
        { id: 's4' },
      ]);
      mockClassService.classRepository.findMany.mockResolvedValue([
        { id: 'c1' },
        { id: 'c2' },
        { id: 'c3' },
        { id: 'c4' },
      ]);

      mockSubjectService.subjectRepository.update.mockResolvedValue({});
      mockClassService.classRepository.update.mockResolvedValue({});

      const result = await service.upgradePlanFree('sch1');

      expect(service.schoolRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: 'FREE' }),
        }),
      );
      expect(mockSubjectService.subjectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's4' },
          data: { isLocked: true },
        }),
      );
      expect(mockClassService.classRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c4' },
          data: { isLocked: true },
        }),
      );
      expect(result.plan).toBe('FREE');
    });
  });

  describe('updateSchool', () => {
    it('should update school info if admin', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'ADMIN',
      });
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        title: 'New Title',
      });

      const result = await service.updateSchool(
        { query: { schoolId: 'sch1' }, body: { title: 'New Title' } } as any,
        { id: 'u1' } as any,
      );

      expect(service.schoolRepository.update).toHaveBeenCalled();
      expect(result.title).toBe('New Title');
    });

    it('should throw ForbiddenException if not admin', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'TEACHER',
      });

      await expect(
        service.updateSchool(
          { query: { schoolId: 'sch1' }, body: {} } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update billing manager and stripe customer', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_customer_id: 'cus1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'ADMIN',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u2',
        email: 'new@manager.com',
        firstName: 'New',
        lastName: 'Manager',
      });
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u2',
      });

      const result = await service.updateSchool(
        {
          query: { schoolId: 'sch1' },
          body: { billingManagerId: 'u2' },
        } as any,
        { id: 'u1' } as any,
      );

      expect(mockStripeService.UpdateCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { email: 'new@manager.com', name: 'New Manager' },
        }),
      );
      expect(service.schoolRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { billingManagerId: 'u2' } }),
      );
      expect(result.billingManagerId).toBe('u2');
    });

    it('should throw BadRequestException if assigning same billing manager', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'ADMIN',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1' });

      await expect(
        service.updateSchool(
          {
            query: { schoolId: 'sch1' },
            body: { billingManagerId: 'u1' },
          } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSchool', () => {
    it('should throw BadRequestException if multiple members exist', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        isDeleted: false,
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'ADMIN',
      });
      mockMemberOnSchoolService.memberOnSchoolRepository.count.mockResolvedValue(
        2,
      );

      await expect(
        service.deleteSchool({ schoolId: 'sch1' }, { id: 'u1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should logically delete school if only one member', async () => {
      (service.schoolRepository.getSchoolById as jest.Mock).mockResolvedValue({
        id: 'sch1',
        isDeleted: false,
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'ADMIN',
      });
      mockMemberOnSchoolService.memberOnSchoolRepository.count.mockResolvedValue(
        1,
      );
      mockUsersService.userRepository.findById.mockResolvedValue({
        favoritSchool: 'sch1',
        id: 'u1',
      });
      (service.schoolRepository.update as jest.Mock).mockResolvedValue({
        id: 'sch1',
        isDeleted: true,
      });

      const result = await service.deleteSchool({ schoolId: 'sch1' }, {
        id: 'u1',
      } as any);

      expect(mockUsersService.userRepository.update).toHaveBeenCalled();
      expect(service.schoolRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isDeleted: true },
        }),
      );
      expect(result.id).toBe('sch1');
    });
  });
});
