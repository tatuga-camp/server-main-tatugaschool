import { Test, TestingModule } from '@nestjs/testing';
import { ScoreOnStudentService } from './score-on-student.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('ScoreOnStudentService', () => {
  let service: ScoreOnStudentService;

  const mockPrismaService = {
    scoreOnStudent: { findUnique: jest.fn() },
    studentOnSubject: { findUnique: jest.fn() },
    scoreOnSubject: { findUnique: jest.fn() },
    subject: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreOnStudentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<ScoreOnStudentService>(ScoreOnStudentService);

    // mock internal repositories
    service.scoreOnStudentRepository = {
      findMany: jest.fn(),
      getAllScoreOnStudentByStudentId: jest.fn(),
      createSocreOnStudent: jest.fn(),
      deleteScoreOnStudent: jest.fn(),
    } as any;

    service.studentOnSubjectRepository = {
      getStudentOnSubjectById: jest.fn(),
      updateStudentOnSubject: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllScoreOnStudentBySubjectId', () => {
    it('should return scores', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnStudentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'sc1' }]);

      const result = await service.getAllScoreOnStudentBySubjectId(
        {
          subjectId: 's1',
          filter: {
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
          },
        },
        { id: 'u1' } as any,
      );

      expect(result).toEqual([{ id: 'sc1' }]);
    });
  });

  describe('customScore', () => {
    it('should calculate difference and create score', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({
        id: 'st1',
        isActive: true,
        subjectId: 's1',
        totalSpeicalScore: 10,
      });
      mockPrismaService.scoreOnSubject.findUnique.mockResolvedValue({
        id: 'ss1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnStudentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ score: 5 }, { score: 2 }]); // total = 7
      (
        service.scoreOnStudentRepository.createSocreOnStudent as jest.Mock
      ).mockResolvedValue({ id: 'new-score', score: 3 }); // target 10 - 7 = 3

      const result = await service.customScore(
        { score: 10, studentOnSubjectId: 'st1', scoreOnSubjectId: 'ss1' },
        { id: 'u1' } as any,
      );

      expect(
        service.scoreOnStudentRepository.createSocreOnStudent,
      ).toHaveBeenCalledWith(expect.objectContaining({ score: 3 }));
      expect(
        service.studentOnSubjectRepository.updateStudentOnSubject,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ data: { totalSpeicalScore: 13 } }),
      );
      expect(result.id).toBe('new-score');
    });

    it('should throw NotFoundException if student not found', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue(null);
      mockPrismaService.scoreOnSubject.findUnique.mockResolvedValue({
        id: 'ss1',
      });

      await expect(
        service.customScore({ score: 10 } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'st1', isActive: true, subjectId: 's1' });
      mockPrismaService.scoreOnSubject.findUnique.mockResolvedValue({
        id: 'ss1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.customScore({ score: 10 } as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createScoreOnStudent', () => {
    it('should create score and increment total score', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({
        id: 'st1',
        isActive: true,
        subjectId: 's1',
        totalSpeicalScore: 5,
      });
      mockPrismaService.scoreOnSubject.findUnique.mockResolvedValue({
        id: 'ss1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnStudentRepository.createSocreOnStudent as jest.Mock
      ).mockResolvedValue({ id: 'sc1' });

      const result = await service.createScoreOnStudent(
        { score: 10, studentOnSubjectId: 'st1', scoreOnSubjectId: 'ss1' },
        { id: 'u1' } as any,
      );

      expect(
        service.scoreOnStudentRepository.createSocreOnStudent,
      ).toHaveBeenCalled();
      expect(
        service.studentOnSubjectRepository.updateStudentOnSubject,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ data: { totalSpeicalScore: 15 } }),
      );
      expect(result.id).toBe('sc1');
    });
  });

  describe('deleteScoreOnStudent', () => {
    it('should delete score and decrement total score', async () => {
      mockPrismaService.scoreOnStudent.findUnique.mockResolvedValue({
        id: 'sc1',
        studentOnSubjectId: 'st1',
        score: 10,
      });
      mockPrismaService.studentOnSubject.findUnique.mockResolvedValue({
        id: 'st1',
        subjectId: 's1',
        totalSpeicalScore: 50,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnStudentRepository.deleteScoreOnStudent as jest.Mock
      ).mockResolvedValue({ message: 'Success' });

      const result = await service.deleteScoreOnStudent(
        { scoreOnStudentId: 'sc1' },
        { id: 'u1' } as any,
      );

      expect(
        service.scoreOnStudentRepository.deleteScoreOnStudent,
      ).toHaveBeenCalled();
      expect(
        service.studentOnSubjectRepository.updateStudentOnSubject,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ data: { totalSpeicalScore: 40 } }),
      );
      expect(result.message).toBe('Success');
    });
  });
});
