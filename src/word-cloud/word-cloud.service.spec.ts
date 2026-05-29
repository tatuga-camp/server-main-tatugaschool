import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WordCloudService } from './word-cloud.service';

describe('WordCloudService', () => {
  let service: WordCloudService;
  const mockValidateAccess = jest.fn();
  const mockPrisma: any = {
    subject: { findUnique: jest.fn() },
    studentOnSubject: { findFirst: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordCloudService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: TeacherOnSubjectService,
          useValue: { ValidateAccess: mockValidateAccess },
        },
      ],
    }).compile();

    service = module.get<WordCloudService>(WordCloudService);

    (service as any).wordCloudRepository = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findManyAnswers: jest.fn(),
      countAnswers: jest.fn(),
      createAnswer: jest.fn(),
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('looks up the subject for schoolId, validates teacher access, and creates', async () => {
      mockPrisma.subject.findUnique.mockResolvedValue({
        id: 'sub1',
        schoolId: 'school1',
      });
      (service as any).wordCloudRepository.create.mockResolvedValue({ id: 'wc1' });

      const result = await service.create(
        { question: 'Q?', subjectId: 'sub1' },
        { id: 'user1' } as any,
      );

      expect(mockValidateAccess).toHaveBeenCalledWith({
        userId: 'user1',
        subjectId: 'sub1',
      });
      expect((service as any).wordCloudRepository.create).toHaveBeenCalledWith({
        data: {
          question: 'Q?',
          subjectId: 'sub1',
          schoolId: 'school1',
          userId: 'user1',
          accessMode: 'PUBLIC',
          allowMultiple: false,
        },
      });
      expect(result).toEqual({ id: 'wc1' });
    });
  });

  describe('getPublic', () => {
    it('returns question/status/config without auth (no roster for PUBLIC)', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        id: 'wc1',
        question: 'Q?',
        status: 'OPEN',
        accessMode: 'PUBLIC',
        allowMultiple: false,
      });
      const result = await service.getPublic({ wordCloudId: 'wc1' });
      expect(result).toEqual({
        id: 'wc1',
        question: 'Q?',
        status: 'OPEN',
        accessMode: 'PUBLIC',
        allowMultiple: false,
        students: [],
      });
      expect(mockPrisma.studentOnSubject.findMany).not.toHaveBeenCalled();
    });

    it('returns the subject roster for STUDENTS_ONLY', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        id: 'wc1',
        subjectId: 'sub1',
        question: 'Q?',
        status: 'OPEN',
        accessMode: 'STUDENTS_ONLY',
        allowMultiple: false,
      });
      mockPrisma.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos1', firstName: 'Ann', lastName: 'Lee' },
      ]);
      const result = await service.getPublic({ wordCloudId: 'wc1' });
      expect(mockPrisma.studentOnSubject.findMany).toHaveBeenCalledWith({
        where: { subjectId: 'sub1', isActive: true },
      });
      expect(result.students).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('attaches answerer names per word for STUDENTS_ONLY', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        id: 'wc1',
        subjectId: 'sub1',
        accessMode: 'STUDENTS_ONLY',
      });
      (service as any).wordCloudRepository.findManyAnswers.mockResolvedValue([
        { text: 'Fun', normalized: 'fun', studentOnSubjectId: 'sos1' },
        { text: 'fun', normalized: 'fun', studentOnSubjectId: 'sos2' },
        { text: 'Hard', normalized: 'hard', studentOnSubjectId: 'sos1' },
      ]);
      mockPrisma.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos1', firstName: 'Ann', lastName: 'Lee' },
        { id: 'sos2', firstName: 'Bob', lastName: 'Kit' },
      ]);

      const result = await service.getById(
        { wordCloudId: 'wc1' },
        { id: 'user1' } as any,
      );

      expect(mockValidateAccess).toHaveBeenCalledWith({
        userId: 'user1',
        subjectId: 'sub1',
      });
      const fun = result.words.find((w) => w.normalized === 'fun');
      expect(fun?.count).toBe(2);
      expect(fun?.students?.sort()).toEqual(['Ann Lee', 'Bob Kit'].sort());
      expect(result.totalAnswers).toBe(3);
    });

    it('does not attach names for PUBLIC clouds', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        id: 'wc1',
        subjectId: 'sub1',
        accessMode: 'PUBLIC',
      });
      (service as any).wordCloudRepository.findManyAnswers.mockResolvedValue([
        { text: 'Fun', normalized: 'fun', studentOnSubjectId: null },
      ]);

      const result = await service.getById(
        { wordCloudId: 'wc1' },
        { id: 'user1' } as any,
      );

      expect(result.words[0].students).toBeUndefined();
      expect(mockPrisma.studentOnSubject.findMany).not.toHaveBeenCalled();
    });
  });

  describe('submitPublic', () => {
    const openPublic = {
      id: 'wc1',
      subjectId: 'sub1',
      schoolId: 'school1',
      status: 'OPEN',
      accessMode: 'PUBLIC',
      allowMultiple: false,
    };

    it('rejects when access mode is STUDENTS_ONLY', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        ...openPublic,
        accessMode: 'STUDENTS_ONLY',
      });
      await expect(
        service.submitPublic(
          { wordCloudId: 'wc1' },
          { text: 'Fun', browserToken: 'b1' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the cloud is CLOSED', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        ...openPublic,
        status: 'CLOSED',
      });
      await expect(
        service.submitPublic(
          { wordCloudId: 'wc1' },
          { text: 'Fun', browserToken: 'b1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a second answer from the same browser when allowMultiple is false', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue(openPublic);
      (service as any).wordCloudRepository.countAnswers.mockResolvedValue(1);
      await expect(
        service.submitPublic(
          { wordCloudId: 'wc1' },
          { text: 'Fun', browserToken: 'b1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects whitespace-only text', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue(openPublic);
      (service as any).wordCloudRepository.countAnswers.mockResolvedValue(0);
      await expect(
        service.submitPublic(
          { wordCloudId: 'wc1' },
          { text: '   ', browserToken: 'b1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores a normalized answer on success', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue(openPublic);
      (service as any).wordCloudRepository.countAnswers.mockResolvedValue(0);
      (service as any).wordCloudRepository.createAnswer.mockResolvedValue({ id: 'a1' });

      await service.submitPublic(
        { wordCloudId: 'wc1' },
        { text: '  FuN  ', browserToken: 'b1' },
      );

      expect((service as any).wordCloudRepository.createAnswer).toHaveBeenCalledWith({
        data: {
          text: '  FuN  ',
          normalized: 'fun',
          browserToken: 'b1',
          wordCloudId: 'wc1',
          subjectId: 'sub1',
          schoolId: 'school1',
        },
      });
    });
  });

  describe('submitStudent', () => {
    const openStudents = {
      id: 'wc1',
      subjectId: 'sub1',
      schoolId: 'school1',
      status: 'OPEN',
      accessMode: 'STUDENTS_ONLY',
      allowMultiple: true,
    };

    it('rejects when student is not enrolled in the subject', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue(openStudents);
      mockPrisma.studentOnSubject.findFirst.mockResolvedValue(null);
      await expect(
        service.submitStudent(
          { wordCloudId: 'wc1' },
          { text: 'Fun', browserToken: 'b1' },
          { id: 'stu1', schoolId: 'school1' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a second student answer from the same browser when allowMultiple is false', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue({
        ...openStudents,
        allowMultiple: false,
      });
      mockPrisma.studentOnSubject.findFirst.mockResolvedValue({ id: 'sos1' });
      (service as any).wordCloudRepository.countAnswers.mockResolvedValue(1);
      await expect(
        service.submitStudent(
          { wordCloudId: 'wc1' },
          { text: 'Cool', browserToken: 'b1' },
          { id: 'stu1', schoolId: 'school1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores studentOnSubjectId on success', async () => {
      (service as any).wordCloudRepository.findUnique.mockResolvedValue(openStudents);
      mockPrisma.studentOnSubject.findFirst.mockResolvedValue({ id: 'sos1' });
      (service as any).wordCloudRepository.createAnswer.mockResolvedValue({ id: 'a1' });

      await service.submitStudent(
        { wordCloudId: 'wc1' },
        { text: 'Cool', browserToken: 'b1' },
        { id: 'stu1', schoolId: 'school1' },
      );

      expect((service as any).wordCloudRepository.createAnswer).toHaveBeenCalledWith({
        data: {
          text: 'Cool',
          normalized: 'cool',
          browserToken: 'b1',
          wordCloudId: 'wc1',
          subjectId: 'sub1',
          schoolId: 'school1',
          studentId: 'stu1',
          studentOnSubjectId: 'sos1',
        },
      });
    });
  });
});
