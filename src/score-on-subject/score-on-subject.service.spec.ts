import { Test, TestingModule } from '@nestjs/testing';
import { ScoreOnSubjectService } from './score-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
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

describe('ScoreOnSubjectService', () => {
  let service: ScoreOnSubjectService;

  const mockPrismaService = {
    scoreOnSubject: { findUnique: jest.fn() },
    subject: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreOnSubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<ScoreOnSubjectService>(ScoreOnSubjectService);

    service.subjectRepository = {
      getSubjectById: jest.fn(),
    } as any;

    service.scoreOnSubjectRepository = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createSocreOnSubject: jest.fn(),
      updateScoreOnSubject: jest.fn(),
      delete: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetAllScoreOnSubjectBySubjectId', () => {
    it('should return score on subject', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'ss1' }]);

      const result = await service.GetAllScoreOnSubjectBySubjectId(
        { subjectId: 's1' },
        { id: 'u1' } as any,
      );

      expect(service.scoreOnSubjectRepository.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'ss1' }]);
    });

    it('should throw NotFoundException if subject not found', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.GetAllScoreOnSubjectBySubjectId({ subjectId: 's1' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createScoreOnSubject', () => {
    it('should create score on subject', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', schoolId: 'sch1', isLocked: false },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnSubjectRepository.createSocreOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'ss1' });

      const result = await service.createScoreOnSubject(
        { subjectId: 's1' } as any,
        { id: 'u1' } as any,
      );

      expect(
        service.scoreOnSubjectRepository.createSocreOnSubject,
      ).toHaveBeenCalled();
      expect(result.id).toBe('ss1');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isLocked: true },
      );

      await expect(
        service.createScoreOnSubject(
          { subjectId: 's1' } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateScoreOnSubject', () => {
    it('should update score on subject', async () => {
      mockPrismaService.scoreOnSubject.findUnique.mockResolvedValue({
        id: 'ss1',
        subjectId: 's1',
      });
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isLocked: false },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.scoreOnSubjectRepository.updateScoreOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'ss1', title: 'New' });

      const result = await service.updateScoreOnSubject(
        { query: { socreOnSubjectId: 'ss1' }, body: { title: 'New' } } as any,
        { id: 'u1' } as any,
      );

      expect(
        service.scoreOnSubjectRepository.updateScoreOnSubject,
      ).toHaveBeenCalled();
      expect(result.id).toBe('ss1');
    });

    it('should throw BadRequestException if icon without blurHash', async () => {
      await expect(
        service.updateScoreOnSubject(
          { body: { icon: 'icon' } } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete score on subject', async () => {
      (
        service.scoreOnSubjectRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'ss1', subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.scoreOnSubjectRepository.delete as jest.Mock).mockResolvedValue({
        id: 'ss1',
      });

      const result = await service.delete({ scoreOnSubjectId: 'ss1' }, {
        id: 'u1',
      } as any);

      expect(service.scoreOnSubjectRepository.delete).toHaveBeenCalledWith({
        scoreOnSubjectId: 'ss1',
      });
      expect(result.id).toBe('ss1');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (
        service.scoreOnSubjectRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'ss1', subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.delete({ scoreOnSubjectId: 'ss1' }, { id: 'u1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
