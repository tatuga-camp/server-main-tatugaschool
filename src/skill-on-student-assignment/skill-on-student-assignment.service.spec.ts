import { Test, TestingModule } from '@nestjs/testing';
import { SkillOnStudentAssignmentService } from './skill-on-student-assignment.service';
import { AppModule } from '../app.module';
import { SkillOnStudentAssignment, User } from '@prisma/client';
import { CreateBySuggestionDto, CreateDto } from './dto';
import { ObjectId } from 'mongodb';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import {
  skillId,
  studentId,
  studentOnAssignmentId,
  userId,
} from '../common/constants';

describe('SkillOnStudentAssignmentService', () => {
  let service: SkillOnStudentAssignmentService;
  let skillOnStudentAssignment: SkillOnStudentAssignment;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillOnStudentAssignmentService, MemberOnSchoolService],
      imports: [AppModule],
    }).compile();

    service = module.get<SkillOnStudentAssignmentService>(
      SkillOnStudentAssignmentService,
    );
  });
  afterAll(async () => {
    await service.skillOnStudentAssignmentRepository.deleteMany({
      where: {
        studentId: skillOnStudentAssignment.studentId,
      },
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CREATE', () => {
    it('should create by suggestion', async () => {
      const dto: CreateBySuggestionDto = {
        studentOnAssignmentId: studentOnAssignmentId,
      };

      const user: User = {
        id: userId,
      } as User;

      const result = await service.suggestCreate(dto, user);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
      skillOnStudentAssignment = result[0];
    });

    it('should not create because duplication', async () => {
      const dto: CreateDto = {
        skillId: skillId,
        studentOnAssignmentId: studentOnAssignmentId,
        weight: 0.3,
      };
      const user: User = {
        id: userId,
      } as User;

      try {
        await service.create(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('GET', () => {
    it('should get by student id', async () => {
      const user: User = {
        id: userId,
      } as User;

      const result = await service.getByStudentId(
        { studentId: studentId },
        user,
      );
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE', () => {
    it('should delete', async () => {
      const user: User = {
        id: userId,
      } as User;

      const result = await service.delete(
        { id: skillOnStudentAssignment.id },
        user,
      );
      expect(result.message).toBeDefined();
    });

    it('should not delete because not found', async () => {
      const user: User = {
        id: userId,
      } as User;
      const randomId = new ObjectId().toString();
      try {
        await service.delete({ id: randomId }, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });
});
