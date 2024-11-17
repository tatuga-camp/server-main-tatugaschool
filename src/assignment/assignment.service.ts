import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { VectorService } from './../vector/vector.service';
import { AssignmentRepository } from './assignment.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  UpdateAssignmentDto,
} from './dto';
import { Assignment, User } from '@prisma/client';

@Injectable()
export class AssignmentService {
  private logger: Logger = new Logger(AssignmentService.name);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
    this.googleStorageService,
  );

  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {}

  async getAssignmentById(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      return assignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAssignmentBySubjectId(
    dto: GetAssignmentBySubjectIdDto,
    user: User,
  ): Promise<Assignment[]> {
    try {
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.assignmentRepository.getBySubjectId({
        subjectId: dto.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createAssignment(
    dto: CreateAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const text = `${dto.title} ${dto.description}`;

      const vectors = await this.vectorService.embbedingText(text);

      return await this.assignmentRepository.create({
        ...dto,
        vector: vectors.predictions[0].embeddings.values,
        schoolId: member.schoolId,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateAssignment(
    dto: UpdateAssignmentDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.query.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });

      let textArray: string[] = [];

      if (dto.data.title) {
        textArray.push(dto.data.title);
      } else if (!dto.data.title) {
        textArray.push(assignment.title);
      }

      if (dto.data.description) {
        textArray.push(dto.data.description);
      } else if (!dto.data.description) {
        textArray.push(assignment.description);
      }

      const text = textArray.join(' ');

      const vectors = await this.vectorService.embbedingText(text);

      return await this.assignmentRepository.update({
        query: dto.query,
        data: {
          ...dto.data,
          vector: vectors.predictions[0].embeddings.values,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteAssignment(
    dto: DeleteAssignmentDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: assignment.subjectId,
      });
      return await this.assignmentRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
