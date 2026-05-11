import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { PrismaService } from '../prisma/prisma.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { SchoolService } from '../school/school.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('TaskService', () => {
  let service: TaskService;

  const mockPrismaService = {
    subject: { findMany: jest.fn() },
    school: { findMany: jest.fn() },
    class: { findMany: jest.fn() },
  };

  const mockLineBotService = {
    sendMessage: jest.fn(),
  };

  const mockSubjectService = {
    reportPendingAssignments: jest.fn(),
    subjectRepository: { deleteSubject: jest.fn() },
  };

  const mockClassService = {
    classRepository: { delete: jest.fn() },
  };

  const mockSchoolService = {
    schoolRepository: { delete: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LineBotService, useValue: mockLineBotService },
        { provide: SubjectService, useValue: mockSubjectService },
        { provide: ClassService, useValue: mockClassService },
        { provide: SchoolService, useValue: mockSchoolService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyPendingAssignments', () => {
    it('should notify pending assignments', async () => {
      mockPrismaService.subject.findMany = jest
        .fn()
        .mockResolvedValueOnce([{ id: 's1', lineGroupId: 'g1' }])
        .mockResolvedValueOnce([]); // stop while loop
      mockSubjectService.reportPendingAssignments.mockResolvedValue('Pending');

      await service.notifyPendingAssignments();

      expect(mockPrismaService.subject.findMany).toHaveBeenCalled();
      expect(mockLineBotService.sendMessage).toHaveBeenCalledWith({
        groupId: 'g1',
        message: 'Pending',
      });
    });
  });

  describe('executeRealDelete', () => {
    it('should delete flagged items', async () => {
      mockPrismaService.school.findMany = jest
        .fn()
        .mockResolvedValueOnce([{ id: 'sch1' }])
        .mockResolvedValueOnce([]);
      mockPrismaService.class.findMany = jest
        .fn()
        .mockResolvedValueOnce([{ id: 'c1' }])
        .mockResolvedValueOnce([]);
      mockPrismaService.subject.findMany = jest
        .fn()
        .mockResolvedValueOnce([{ id: 's1' }])
        .mockResolvedValueOnce([]);

      mockSchoolService.schoolRepository.delete.mockResolvedValue(true);
      mockClassService.classRepository.delete.mockResolvedValue(true);
      mockSubjectService.subjectRepository.deleteSubject.mockResolvedValue(
        true,
      );

      await service.executeRealDelete();

      expect(mockSchoolService.schoolRepository.delete).toHaveBeenCalledWith({
        schoolId: 'sch1',
      });
      expect(mockClassService.classRepository.delete).toHaveBeenCalledWith({
        classId: 'c1',
      });
      expect(
        mockSubjectService.subjectRepository.deleteSubject,
      ).toHaveBeenCalledWith({ subjectId: 's1' });
    });
  });
});
