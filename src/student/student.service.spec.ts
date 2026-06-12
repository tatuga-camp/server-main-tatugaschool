import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StorageService } from '../storage/storage.service';
import { ClassService } from '../class/class.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('StudentService', () => {
  let service: StudentService;

  const mockPrismaService = {};

  const mockMemberOnSchoolService = {
    validateAccess: jest.fn(),
  };

  const mockClassService = {
    classRepository: {
      findById: jest.fn(),
    },
    validateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MemberOnSchoolService, useValue: mockMemberOnSchoolService },
        { provide: StorageService, useValue: {} },
        { provide: ClassService, useValue: mockClassService },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);

    service.studentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByClassId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createStudent', () => {
    it('should create student with provided photo', async () => {
      const dto: any = { classId: 'c1', photo: 'custom.jpg' };
      mockClassService.classRepository.findById.mockResolvedValue({
        id: 'c1',
        schoolId: 'sch1',
      });
      mockClassService.validateAccess.mockResolvedValue(true);
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.studentRepository.create as jest.Mock).mockResolvedValue({
        id: 'st1',
        photo: 'custom.jpg',
      });

      const result = await service.createStudent(dto, { id: 'u1' } as any);

      expect(service.studentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ photo: 'custom.jpg', schoolId: 'sch1' }),
      );
      expect(result.id).toBe('st1');
    });

    it('should assign a random photo if none is provided', async () => {
      const dto: any = { classId: 'c1' };
      mockClassService.classRepository.findById.mockResolvedValue({
        id: 'c1',
        schoolId: 'sch1',
      });
      (service.studentRepository.create as jest.Mock).mockResolvedValue({
        id: 'st1',
      });

      await service.createStudent(dto, { id: 'u1' } as any);

      expect(service.studentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ schoolId: 'sch1' }),
      );
      const callArg = (service.studentRepository.create as jest.Mock).mock
        .calls[0][0];
      expect(callArg.photo).toContain('AVATAR');
    });

    it('should throw NotFoundException if class not found', async () => {
      mockClassService.classRepository.findById.mockResolvedValue(null);

      await expect(
        service.createStudent({ classId: 'c1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStudentById', () => {
    it('should return student if user has access', async () => {
      (service.studentRepository.findById as jest.Mock).mockResolvedValue({
        id: 'st1',
        schoolId: 'sch1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);

      const result = await service.getStudentById({ studentId: 'st1' }, {
        id: 'u1',
      } as any);

      expect(result.id).toBe('st1');
    });

    it('should throw NotFoundException if student not found', async () => {
      (service.studentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getStudentById({ studentId: 'st1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllStudents', () => {
    it('should return students of class', async () => {
      mockClassService.classRepository.findById.mockResolvedValue({
        id: 'c1',
        schoolId: 'sch1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.studentRepository.findByClassId as jest.Mock).mockResolvedValue([
        { id: 'st1' },
      ]);

      const result = await service.getAllStudents({ classId: 'c1' }, {
        id: 'u1',
      } as any);

      expect(result[0].id).toBe('st1');
    });
  });

  describe('resetStudnetPassword', () => {
    it('should set password to null', async () => {
      (service.studentRepository.findById as jest.Mock).mockResolvedValue({
        id: 'st1',
        schoolId: 'sch1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.studentRepository.update as jest.Mock).mockResolvedValue({
        id: 'st1',
        password: null,
      });

      const result = await service.resetStudnetPassword({ studentId: 'st1' }, {
        id: 'u1',
      } as any);

      expect(service.studentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ body: { password: null } }),
      );
      expect(result.id).toBe('st1');
    });
  });

  describe('updateStudent', () => {
    it('should update student successfully', async () => {
      const dto: any = {
        query: { studentId: 'st1' },
        body: { firstName: 'New' },
      };
      (service.studentRepository.findById as jest.Mock).mockResolvedValue({
        id: 'st1',
        classId: 'c1',
        schoolId: 'sch1',
      });
      mockClassService.validateAccess.mockResolvedValue(true);
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.studentRepository.update as jest.Mock).mockResolvedValue({
        id: 'st1',
        firstName: 'New',
      });

      const result = await service.updateStudent(dto, { id: 'u1' } as any);

      expect(service.studentRepository.update).toHaveBeenCalled();
      expect(result.firstName).toBe('New');
    });

    it('should hash new password if provided', async () => {
      const dto: any = {
        query: { studentId: 'st1' },
        body: { password: 'newpass' },
      };
      (service.studentRepository.findById as jest.Mock).mockResolvedValue({
        id: 'st1',
        classId: 'c1',
        schoolId: 'sch1',
      });
      mockClassService.validateAccess.mockResolvedValue(true);
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);

      await service.updateStudent(dto, { id: 'u1' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
      expect(service.studentRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ password: 'hashed_password' }),
        }),
      );
    });

    it('should throw BadRequestException if photo without blurHash', async () => {
      await expect(
        service.updateStudent({ body: { photo: 'pic.jpg' } } as any, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteStudent', () => {
    it('should delete student', async () => {
      (service.studentRepository.findById as jest.Mock).mockResolvedValue({
        id: 'st1',
        schoolId: 'sch1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.studentRepository.delete as jest.Mock).mockResolvedValue({
        id: 'st1',
      });

      const result = await service.deleteStudent({ studentId: 'st1' }, {
        id: 'u1',
      } as any);

      expect(service.studentRepository.delete).toHaveBeenCalledWith({
        studentId: 'st1',
      });
      expect(result.id).toBe('st1');
    });
  });
});
