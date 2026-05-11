import { Test, TestingModule } from '@nestjs/testing';
import { GroupOnSubjectService } from './group-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('GroupOnSubjectService', () => {
  let service: GroupOnSubjectService;

  const mockPrismaService = {};

  const mockSubjectService = {
    subjectRepository: {
      findUnique: jest.fn(),
      getSubjectById: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockStudentOnSubjectService = {
    studentOnSubjectRepository: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupOnSubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SubjectService, useValue: mockSubjectService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        {
          provide: StudentOnSubjectService,
          useValue: mockStudentOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<GroupOnSubjectService>(GroupOnSubjectService);

    // Mock internal repositories
    service.groupOnSubjectRepository = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    (service as any).unitOnGroupRepository = {
      findMany: jest.fn(),
      create: jest.fn(),
    };

    (service as any).studentOnGroupRepository = {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getGroupOnSubjects', () => {
    it('should return group on subjects', async () => {
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue({
        id: 's1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.groupOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'g1' }]);

      const result = await service.getGroupOnSubjects({ subjectId: 's1' }, {
        id: 'u1',
      } as any);

      expect(service.groupOnSubjectRepository.findMany).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'g1' }]);
    });

    it('should throw NotFoundException if subject not found', async () => {
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.getGroupOnSubjects({ subjectId: 's1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGroupOnSubject', () => {
    it('should return group on subject with units and students', async () => {
      (
        service.groupOnSubjectRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'g1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      (service as any).unitOnGroupRepository.findMany.mockResolvedValue([
        { id: 'u1' },
      ]);
      (service as any).studentOnGroupRepository.findMany.mockResolvedValue([
        { id: 'sg1', unitOnGroupId: 'u1' },
      ]);

      const result = await service.getGroupOnSubject(
        { groupOnSubjectId: 'g1' },
        { id: 'u1' } as any,
      );

      expect(result.units[0].id).toBe('u1');
      expect(result.units[0].students[0].id).toBe('sg1');
    });
  });

  describe('create', () => {
    it('should create group randomly', async () => {
      mockSubjectService.subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.groupOnSubjectRepository.create as jest.Mock).mockResolvedValue({
        id: 'g1',
      });

      const mockStudents = [{ id: 'st1' }, { id: 'st2' }, { id: 'st3' }];
      mockStudentOnSubjectService.studentOnSubjectRepository.findMany.mockResolvedValue(
        mockStudents,
      );

      (service as any).unitOnGroupRepository.create.mockImplementation(
        ({ data }: any) =>
          Promise.resolve({ id: `u_${data.order}`, groupOnSubjectId: 'g1' }),
      );
      (service as any).studentOnGroupRepository.create.mockImplementation(
        ({ data }: any) => Promise.resolve({ ...data, id: 'sg1' }),
      );

      const result = await service.create(
        { subjectId: 's1', numberOfGroups: 2 } as any,
        { id: 'u1' } as any,
      );

      expect(result.units.length).toBe(2);
      expect(result.units[0].students.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('groupStudentsRandomly', () => {
    it('should split students correctly into groups', () => {
      const students = [1, 2, 3, 4, 5, 6, 7] as any;
      const groups = service.groupStudentsRandomly(students, 3);

      expect(groups.length).toBe(3);
      expect(groups[0].length).toBe(3);
      expect(groups[1].length).toBe(2);
      expect(groups[2].length).toBe(2);
    });

    it('should throw BadRequestException if inputs are invalid', () => {
      expect(() => service.groupStudentsRandomly([], 2)).toThrow(
        BadRequestException,
      );
      expect(() => service.groupStudentsRandomly([1, 2] as any, 0)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('refetchGroup', () => {
    it('should regroup students', async () => {
      (
        service.groupOnSubjectRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'g1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      mockStudentOnSubjectService.studentOnSubjectRepository.findMany.mockResolvedValue(
        [{ id: 'st1' }],
      );
      (service as any).studentOnGroupRepository.deleteMany.mockResolvedValue(
        {},
      );
      (service as any).unitOnGroupRepository.findMany.mockResolvedValue([
        { id: 'u1' },
      ]);

      (service as any).studentOnGroupRepository.create.mockResolvedValue({
        id: 'sg1',
        unitOnGroupId: 'u1',
      });

      const result = await service.refetchGroup({ groupOnSubjectId: 'g1' }, {
        id: 'u1',
      } as any);

      expect(
        (service as any).studentOnGroupRepository.deleteMany,
      ).toHaveBeenCalled();
      expect(result.units[0].students.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should update group on subject', async () => {
      (
        service.groupOnSubjectRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'g1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.groupOnSubjectRepository.update as jest.Mock).mockResolvedValue({
        id: 'g1',
        title: 'New',
      });

      const result = await service.update(
        { query: { groupOnSubjectId: 'g1' }, body: { title: 'New' } },
        { id: 'u1' } as any,
      );

      expect(result.title).toBe('New');
    });
  });

  describe('delete', () => {
    it('should delete group on subject', async () => {
      (
        service.groupOnSubjectRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'g1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.groupOnSubjectRepository.delete as jest.Mock).mockResolvedValue({
        id: 'g1',
      });

      const result = await service.delete({ groupOnSubjectId: 'g1' }, {
        id: 'u1',
      } as any);

      expect(service.groupOnSubjectRepository.delete).toHaveBeenCalledWith({
        groupOnSubjectId: 'g1',
      });
      expect(result.id).toBe('g1');
    });
  });
});
