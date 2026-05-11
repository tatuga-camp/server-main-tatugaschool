import { Test, TestingModule } from '@nestjs/testing';
import { CareerService } from './career.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { SkillService } from '../skill/skill.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StudentService } from '../student/student.service';
import { AuthService } from '../auth/auth.service';
import { BadRequestException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('CareerService', () => {
  let service: CareerService;

  const mockPrismaService = {};

  const mockAiService = {
    embbedingText: jest.fn(),
  };

  const mockSkillOnStudentAssignmentService = {
    skillOnStudentAssignmentRepository: {
      findMany: jest.fn(),
    },
  };

  const mockSkillService = {
    skillRepository: {
      findMany: jest.fn(),
    },
  };

  const mockAuthService = {
    getGoogleAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        {
          provide: SkillOnStudentAssignmentService,
          useValue: mockSkillOnStudentAssignmentService,
        },
        { provide: SkillService, useValue: mockSkillService },
        { provide: MemberOnSchoolService, useValue: {} },
        { provide: StudentService, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<CareerService>(CareerService);

    // Mock internal repositories
    service.careerRepository = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    (service as any).skillOnCareerRepository = {
      findMany: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('suggest', () => {
    it('should throw BadRequestException if no student skill data', async () => {
      mockSkillOnStudentAssignmentService.skillOnStudentAssignmentRepository.findMany.mockResolvedValue(
        [],
      );

      await expect(
        service.suggest({ studentId: 'st1' }, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return career suggestions', async () => {
      const mockSkillOnStudents = [
        { skillId: 'sk1', weight: 10 },
        { skillId: 'sk1', weight: 20 },
      ]; // Avg = 15

      const mockCareers = [{ id: 'c1' }];
      const mockAllSkillOnCareers = [
        { careerId: 'c1', skillId: 'sk1', weight: 10 },
      ]; // Population score = 10, Avg = 10
      const mockAllSkills = [{ id: 'sk1', title: 'Skill 1' }];

      mockSkillOnStudentAssignmentService.skillOnStudentAssignmentRepository.findMany.mockResolvedValue(
        mockSkillOnStudents,
      );
      (service.careerRepository.findMany as jest.Mock).mockResolvedValue(
        mockCareers,
      );
      (service as any).skillOnCareerRepository.findMany.mockResolvedValue(
        mockAllSkillOnCareers,
      );
      mockSkillService.skillRepository.findMany.mockResolvedValue(
        mockAllSkills,
      );

      const result = await service.suggest({ studentId: 'st1' }, {} as any);

      expect(result.student.skills[0].avg).toBe(15);
      expect(result.careers[0].skills[0].avg).toBe(10);
      expect(result.careers[0].skills[0].matchPoint).toBe(15 / 10);
      expect(result.careers[0].careerMatchPoint).toBe(1.5);
    });
  });

  describe('getOne', () => {
    it('should return career and skills', async () => {
      (service.careerRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 'c1',
      });
      (service as any).skillOnCareerRepository.findMany.mockResolvedValue([
        { id: 'soc1' },
      ]);

      const result = await service.getOne({ careerId: 'c1' });

      expect(result).toEqual({ id: 'c1', skills: [{ id: 'soc1' }] });
    });
  });

  describe('create', () => {
    it('should create career', async () => {
      const dto: any = { title: 'Engineer' };
      (service.careerRepository.create as jest.Mock).mockResolvedValue({
        id: 'c1',
        title: 'Engineer',
      });

      const result = await service.create(dto);

      expect(service.careerRepository.create).toHaveBeenCalledWith({
        data: dto,
      });
      expect(result.id).toBe('c1');
    });
  });

  describe('update', () => {
    it('should update career and embed text', async () => {
      const dto: any = {
        query: { id: 'c1' },
        body: { title: 'Title', description: 'Desc', keywords: 'K' },
      };

      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      mockAiService.embbedingText.mockResolvedValue({});
      (service.careerRepository.update as jest.Mock).mockResolvedValue({
        id: 'c1',
      });

      const result = await service.update(dto);

      expect(mockAuthService.getGoogleAccessToken).toHaveBeenCalled();
      expect(mockAiService.embbedingText).toHaveBeenCalled();
      expect(service.careerRepository.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: dto.body,
      });
      expect(result.id).toBe('c1');
    });
  });

  describe('delete', () => {
    it('should delete career', async () => {
      (service.careerRepository.delete as jest.Mock).mockResolvedValue({});

      const result = await service.delete({ id: 'c1' });

      expect(service.careerRepository.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(result.message).toBe('Career deleted successfully');
    });
  });
});
