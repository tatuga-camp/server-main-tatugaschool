import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QuestionOnVideo, User } from '@prisma/client';
import { AssignmentRepository } from '../assignment/assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { AssignmentVideoQuizRepository } from './assignment-video-quiz.repository';
import { CreateQuestionOnVideoDto, UpdateQuestionOnVideoDto } from './dto';

@Injectable()
export class AssignmentVideoQuizService {
  private logger: Logger;
  constructor(
    private prisma: PrismaService,
    private repository: AssignmentVideoQuizRepository,
    private assignmentRepository: AssignmentRepository,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.logger = new Logger();
  }

  async create(
    dto: CreateQuestionOnVideoDto,
    user: User,
  ): Promise<QuestionOnVideo> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) throw new NotFoundException('Assignment Not Found');

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: assignment.subjectId,
        userId: user.id,
      });

      const create = await this.repository.create({
        data: {
          ...dto,
          subjectId: assignment.subjectId,
        },
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getManyByAssignmentId(
    assignmentId: string,
    user: User,
  ): Promise<QuestionOnVideo[]> {
    try {
      const assignment = await this.assignmentRepository.getById({
        assignmentId,
      });

      if (!assignment) throw new NotFoundException('Assignment Not Found');

      // Check if user has access to the subject
      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: assignment.subjectId,
        userId: user.id,
      });

      return await this.repository.findMany({
        where: {
          assignmentId: assignmentId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateQuestionOnVideoDto,
    user: User,
  ): Promise<QuestionOnVideo> {
    try {
      const question = await this.repository.findUnique({
        where: { id },
      });

      if (!question) throw new NotFoundException('Question Not Found');

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: question.subjectId,
        userId: user.id,
      });

      return await this.repository.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(id: string, user: User): Promise<QuestionOnVideo> {
    try {
      const question = await this.repository.findUnique({
        where: { id },
      });

      if (!question) throw new NotFoundException('Question Not Found');

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: question.subjectId,
        userId: user.id,
      });

      return await this.repository.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
