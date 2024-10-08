import { AssignmentService } from './assignment.service';
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  UpdateAssignmentDto,
} from './dto';
import { Assignment, User } from '@prisma/client';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { VectorModule } from '../vector/vector.module';
import { GoogleStorageModule } from '../google-storage/google-storage.module';

describe('AssignmentService', () => {
  let assignmentService: AssignmentService;
  let assignment: Assignment;
  const userId = '66d5edd6ab46227db7d5e2db';
  const anotherUserId = '66ace7578c5561b748d8b3b3';
  const subjectId = '66e7bded002943028083dda4';
  const assignmentIdNotFound = '66ebc40ead22355cc1e8e13b';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AssignmentService],
      imports: [
        GoogleStorageModule,
        VectorModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        HttpModule,
        AuthModule,
        EmailModule,
        PrismaModule,
      ],
    }).compile();

    assignmentService = module.get<AssignmentService>(AssignmentService);
  });

  it('should be defined', () => {
    expect(assignmentService).toBeDefined();
  });

  describe('Create Assignment', () => {
    it('should create an assignment', async () => {
      const user = {
        id: userId,
      } as User;

      const dto: CreateAssignmentDto = {
        title: 'Assignment 1',
        description: 'Assignment 1 description',
        subjectId: subjectId,
        maxScore: 100,
        weight: 1,
        beginDate: new Date().toISOString(),
        dueDate: new Date(new Date().getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      };
      assignment = await assignmentService.createAssignment(dto, user);

      expect(assignment).toBeDefined();
    });
    it('should throw error when teacher is not part of the subject or not accept invitiation yet', async () => {
      const user = {
        id: anotherUserId,
      } as User;

      const dto: CreateAssignmentDto = {
        title: 'Assignment 1',
        description: 'Assignment 1 description',
        subjectId: subjectId,
        maxScore: 100,
        weight: 1,
        beginDate: new Date().toISOString(),
        dueDate: new Date(new Date().getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      };
      try {
        await assignmentService.createAssignment(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('Get Assignment', () => {
    it('should get assignment by ID', async () => {
      const user = {
        id: userId,
      } as User;
      const dto: GetAssignmentByIdDto = {
        assignmentId: assignment.id,
      };
      const getAssignment = await assignmentService.getAssignmentById(
        dto,
        user,
      );
      expect(getAssignment).toBeDefined();
    });

    it('should not allow other teacher to get assignment', async () => {
      const user = {
        id: anotherUserId,
      } as User;
      const dto: GetAssignmentByIdDto = {
        assignmentId: assignment.id,
      };
      try {
        await assignmentService.getAssignmentById(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should not allow get assignment when not found', async () => {
      const user = {
        id: userId,
      } as User;
      const dto: GetAssignmentByIdDto = {
        assignmentId: assignmentIdNotFound,
      };
      try {
        await assignmentService.getAssignmentById(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('Get Assignment By SubjectId', () => {
    it('should get assignments', async () => {
      const user = {
        id: userId,
      } as User;

      const dto: GetAssignmentBySubjectIdDto = {
        subjectId: subjectId,
      };

      const assignments = await assignmentService.getAssignmentBySubjectId(
        dto,
        user,
      );
      expect(assignments).toBeDefined();
    });

    it('should not allow other teachers', async () => {
      const user = {
        id: anotherUserId,
      } as User;

      const dto: GetAssignmentBySubjectIdDto = {
        subjectId: subjectId,
      };

      try {
        await assignmentService.getAssignmentBySubjectId(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('Update Assignment', () => {
    it('should update assignment', async () => {
      const user = {
        id: userId,
      } as User;
      const updateDueDate = new Date(new Date().getTime() + 60 * 60 * 1000);
      const dto: UpdateAssignmentDto = {
        query: {
          assignmentId: assignment.id,
        },
        data: {
          title: 'Updated Assignment 1',
          description: 'Updated Assignment 1 description',
          maxScore: 55,
          weight: 0.5,
          dueDate: updateDueDate.toISOString(),
          isAllowDeleteWork: true,
        },
      };

      assignment = await assignmentService.updateAssignment(dto, user);
      expect(assignment.title).toBe('Updated Assignment 1');
      expect(assignment.description).toBe('Updated Assignment 1 description');
      expect(assignment.maxScore).toBe(55);
      expect(assignment.weight).toBe(0.5);
      expect(assignment.dueDate.toISOString()).toBe(
        updateDueDate.toISOString(),
      );
      expect(assignment.isAllowDeleteWork).toBe(true);
    });

    it('should not allow other teachers outside teacherOnSubject to update its assignment', async () => {
      const user = {
        id: anotherUserId,
      } as User;

      const dto: UpdateAssignmentDto = {
        query: {
          assignmentId: assignment.id,
        },
        data: {
          title: 'Updated Assignment 1',
        },
      };

      try {
        await assignmentService.updateAssignment(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should not allow update when not found assignment', async () => {
      const user = {
        id: userId,
      } as User;

      const dto: UpdateAssignmentDto = {
        query: {
          assignmentId: assignmentIdNotFound,
        },
        data: {
          title: 'Updated Assignment 1',
        },
      };

      try {
        await assignmentService.updateAssignment(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });
  describe('Delete Assignment', () => {
    it('should throw error when not found assignment', async () => {
      const user = {
        id: userId,
      } as User;

      const dto: DeleteAssignmentDto = {
        assignmentId: assignmentIdNotFound,
      };

      try {
        await assignmentService.deleteAssignment(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should not allow other user to delete assignment', async () => {
      const user = {
        id: anotherUserId,
      } as User;

      const dto: DeleteAssignmentDto = {
        assignmentId: assignment.id,
      };

      try {
        await assignmentService.deleteAssignment(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should delete assignment', async () => {
      const user = {
        id: userId,
      } as User;

      const dto: DeleteAssignmentDto = {
        assignmentId: assignment.id,
      };

      const deleteAssignment = await assignmentService.deleteAssignment(
        dto,
        user,
      );
      expect(deleteAssignment.message).toBeDefined();
    });
  });
});
