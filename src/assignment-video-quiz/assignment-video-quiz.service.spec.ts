import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentVideoQuizService } from './assignment-video-quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentVideoQuizRepository } from './assignment-video-quiz.repository';
import { AssignmentRepository } from '../assignment/assignment.repository';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotFoundException } from '@nestjs/common';

describe('AssignmentVideoQuizService', () => {
  let service: AssignmentVideoQuizService;

  const mockPrismaService = {};

  const mockRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAssignmentRepository = {
    getById: jest.fn(),
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentVideoQuizService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AssignmentVideoQuizRepository, useValue: mockRepository },
        { provide: AssignmentRepository, useValue: mockAssignmentRepository },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<AssignmentVideoQuizService>(
      AssignmentVideoQuizService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a question successfully', async () => {
      const mockUser = { id: 'user1' } as any;
      const dto: any = { assignmentId: 'a1', questionText: 'Q1' };
      const mockAssignment = { id: 'a1', subjectId: 's1' };
      const mockCreated = {
        id: 'q1',
        assignmentId: 'a1',
        subjectId: 's1',
        questionText: 'Q1',
      };

      mockAssignmentRepository.getById.mockResolvedValue(mockAssignment);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockRepository.create.mockResolvedValue(mockCreated);

      const result = await service.create(dto, mockUser);

      expect(mockAssignmentRepository.getById).toHaveBeenCalledWith({
        assignmentId: 'a1',
      });
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        subjectId: 's1',
        userId: 'user1',
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          subjectId: 's1',
        },
      });
      expect(result).toEqual(mockCreated);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockAssignmentRepository.getById.mockResolvedValue(null);

      await expect(
        service.create({ assignmentId: 'a1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getManyByAssignmentId', () => {
    it('should return questions for a given assignment ID', async () => {
      const mockUser = { id: 'user1' } as any;
      const mockAssignment = { id: 'a1', subjectId: 's1' };
      const mockQuestions = [{ id: 'q1' }, { id: 'q2' }];

      mockAssignmentRepository.getById.mockResolvedValue(mockAssignment);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockRepository.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getManyByAssignmentId('a1', mockUser);

      expect(mockAssignmentRepository.getById).toHaveBeenCalledWith({
        assignmentId: 'a1',
      });
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        subjectId: 's1',
        userId: 'user1',
      });
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        where: { assignmentId: 'a1' },
      });
      expect(result).toEqual(mockQuestions);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      mockAssignmentRepository.getById.mockResolvedValue(null);

      await expect(
        service.getManyByAssignmentId('a1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a question successfully', async () => {
      const mockUser = { id: 'user1' } as any;
      const dto: any = { questionText: 'Updated Q' };
      const mockQuestion = { id: 'q1', subjectId: 's1' };
      const mockUpdated = {
        id: 'q1',
        subjectId: 's1',
        questionText: 'Updated Q',
      };

      mockRepository.findUnique.mockResolvedValue(mockQuestion);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockRepository.update.mockResolvedValue(mockUpdated);

      const result = await service.update('q1', dto, mockUser);

      expect(mockRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'q1' },
      });
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        subjectId: 's1',
        userId: 'user1',
      });
      expect(mockRepository.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: dto,
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should throw NotFoundException if question not found', async () => {
      mockRepository.findUnique.mockResolvedValue(null);

      await expect(service.update('q1', {} as any, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a question successfully', async () => {
      const mockUser = { id: 'user1' } as any;
      const mockQuestion = { id: 'q1', subjectId: 's1' };

      mockRepository.findUnique.mockResolvedValue(mockQuestion);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockRepository.delete.mockResolvedValue(mockQuestion);

      const result = await service.delete('q1', mockUser);

      expect(mockRepository.findUnique).toHaveBeenCalledWith({
        where: { id: 'q1' },
      });
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        subjectId: 's1',
        userId: 'user1',
      });
      expect(mockRepository.delete).toHaveBeenCalledWith({
        where: { id: 'q1' },
      });
      expect(result).toEqual(mockQuestion);
    });

    it('should throw NotFoundException if question not found', async () => {
      mockRepository.findUnique.mockResolvedValue(null);

      await expect(service.delete('q1', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
