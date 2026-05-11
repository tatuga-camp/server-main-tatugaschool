import { Test, TestingModule } from '@nestjs/testing';
import { TeacherOnSubjectService } from './teacher-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
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

describe('TeacherOnSubjectService', () => {
  let service: TeacherOnSubjectService;

  const mockPrismaService = {
    subject: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock_url'),
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherOnSubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<TeacherOnSubjectService>(TeacherOnSubjectService);

    service.memberOnSchoolRepository = {
      findFirst: jest.fn(),
      getMemberOnSchoolByUserIdAndSchoolId: jest.fn(),
    } as any;

    service.teacherOnSubjectRepository = {
      getByTeacherIdAndSubjectId: jest.fn(),
      getById: jest.fn(),
      getManyBySubjectId: jest.fn(),
      getManyByTeacherId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ValidateAccess', () => {
    it('should throw NotFoundException if subject not found', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.ValidateAccess({ userId: 'u1', subjectId: 's1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return admin-school if member is admin', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      (
        service.memberOnSchoolRepository.findFirst as jest.Mock
      ).mockResolvedValue({ status: 'ACCEPT', role: 'ADMIN' });

      const result = await service.ValidateAccess({
        userId: 'u1',
        subjectId: 's1',
      });

      expect(result).toBe('admin-school');
    });

    it('should return memberOnSubject if user is teacher', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      (
        service.memberOnSchoolRepository.findFirst as jest.Mock
      ).mockResolvedValue({ status: 'ACCEPT', role: 'TEACHER' });
      (
        service.teacherOnSubjectRepository
          .getByTeacherIdAndSubjectId as jest.Mock
      ).mockResolvedValue({ status: 'ACCEPT' });

      const result = await service.ValidateAccess({
        userId: 'u1',
        subjectId: 's1',
      });

      expect((result as any).status).toBe('ACCEPT');
    });

    it('should throw ForbiddenException if user not member', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      (
        service.memberOnSchoolRepository.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.ValidateAccess({ userId: 'u1', subjectId: 's1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTeacherOnSubject', () => {
    it('should throw ForbiddenException if subject locked', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.createTeacherOnSubject(
          { subjectId: 's1' } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create teacher and send email', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
        isLocked: false,
        title: 'Math',
      });

      (
        service.memberOnSchoolRepository
          .getMemberOnSchoolByUserIdAndSchoolId as jest.Mock
      ).mockResolvedValue({ status: 'ACCEPT', role: 'ADMIN' });
      (
        service.memberOnSchoolRepository.findFirst as jest.Mock
      ).mockResolvedValue({ status: 'ACCEPT' });
      (
        service.teacherOnSubjectRepository
          .getByTeacherIdAndSubjectId as jest.Mock
      ).mockResolvedValue(null);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u2',
        email: 't@t.com',
        firstName: 'Teacher',
      });
      (
        service.teacherOnSubjectRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'ts1' });
      mockEmailService.sendMail.mockResolvedValue({});

      const result = await service.createTeacherOnSubject(
        { subjectId: 's1', email: 't@t.com', role: 'TEACHER' },
        { id: 'u1' } as any,
      );

      expect(service.teacherOnSubjectRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendMail).toHaveBeenCalled();
      expect(result.id).toBe('ts1');
    });
  });

  describe('updateTeacherOnSubject', () => {
    it('should update teacher on subject', async () => {
      (
        service.teacherOnSubjectRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'ts1', subjectId: 's1', userId: 'u2' });
      (
        service.teacherOnSubjectRepository
          .getByTeacherIdAndSubjectId as jest.Mock
      ).mockResolvedValue({ id: 'ts_admin', role: 'ADMIN' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.teacherOnSubjectRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'ts1' });

      const result = await service.updateTeacherOnSubject(
        { query: { teacherOnSubjectId: 'ts1' }, body: {} } as any,
        { id: 'u1' } as any,
      );

      expect(service.teacherOnSubjectRepository.update).toHaveBeenCalled();
      expect(result.id).toBe('ts1');
    });

    it('should delete if status is REJECT', async () => {
      (
        service.teacherOnSubjectRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'ts1', subjectId: 's1', userId: 'u1' });
      (
        service.teacherOnSubjectRepository
          .getByTeacherIdAndSubjectId as jest.Mock
      ).mockResolvedValue({ id: 'ts_admin', role: 'TEACHER' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.teacherOnSubjectRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'ts1' });
      (
        service.teacherOnSubjectRepository.delete as jest.Mock
      ).mockResolvedValue({});

      await service.updateTeacherOnSubject(
        {
          query: { teacherOnSubjectId: 'ts1' },
          body: { status: 'REJECT' },
        } as any,
        { id: 'u1' } as any,
      );

      expect(service.teacherOnSubjectRepository.delete).toHaveBeenCalledWith({
        teacherOnSubjectId: 'ts1',
      });
    });
  });

  describe('DeleteTeacherOnSubject', () => {
    it('should delete teacher on subject', async () => {
      (
        service.teacherOnSubjectRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'ts1', subjectId: 's1', userId: 'u2' });
      (
        service.teacherOnSubjectRepository
          .getByTeacherIdAndSubjectId as jest.Mock
      ).mockResolvedValue({ id: 'ts_admin', role: 'ADMIN' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.teacherOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([
        { id: 'ts_admin', role: 'ADMIN' },
        { id: 'ts_admin2', role: 'ADMIN' },
      ]);
      (
        service.teacherOnSubjectRepository.delete as jest.Mock
      ).mockResolvedValue({ message: 'Deleted' });

      const result = await service.DeleteTeacherOnSubject(
        { teacherOnSubjectId: 'ts1' },
        { id: 'u1' } as any,
      );

      expect(service.teacherOnSubjectRepository.delete).toHaveBeenCalled();
      expect((result as any).message).toBe('Deleted');
    });

    it('should throw BadRequestException if deleting last admin', async () => {
      (
        service.teacherOnSubjectRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'ts1', subjectId: 's1', userId: 'u1' });
      (
        service.teacherOnSubjectRepository
          .getByTeacherIdAndSubjectId as jest.Mock
      ).mockResolvedValue({ id: 'ts1', role: 'ADMIN' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.teacherOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'ts1', role: 'ADMIN' }]);

      await expect(
        service.DeleteTeacherOnSubject({ teacherOnSubjectId: 'ts1' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
