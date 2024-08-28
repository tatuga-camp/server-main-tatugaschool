import { AssignmentRepository } from './../assignment/assignment.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { SkillOnAssignmentRepository } from './skill-on-assignment.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetAssignmentByIdDto } from '../assignment/dto';
import { SkillOnAssignment, User } from '@prisma/client';
import { CreateSkillOnAssignmentDto, DeleteSkillOnAssignmentDto } from './dto';

@Injectable()
export class SkillOnAssignmentService {
  logger: Logger = new Logger(SkillOnAssignmentService.name);
  skillOnAssignmentRepository: SkillOnAssignmentRepository =
    new SkillOnAssignmentRepository(this.prisma);
  teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
  );
  constructor(private prisma: PrismaService) {}

  async getByAssignmentId(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<SkillOnAssignment[]> {
    try {
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });

      if (!teacherOnSubject && user.role !== 'ADMIN') {
        throw new ForbiddenException("You don't have permission");
      }

      const skillOnAssignment =
        await this.skillOnAssignmentRepository.getByAssignmentId({
          assignmentId: dto.assignmentId,
        });

      return skillOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: CreateSkillOnAssignmentDto,
    user: User,
  ): Promise<SkillOnAssignment> {
    try {
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });

      if (!teacherOnSubject && user.role !== 'ADMIN') {
        throw new ForbiddenException("You don't have permission");
      }

      const skillOnAssignment = await this.skillOnAssignmentRepository.create({
        ...dto,
        subjectId: assignment.subjectId,
      });
      return skillOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteSkillOnAssignmentDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const skillOnAssingment = await this.skillOnAssignmentRepository.getById({
        id: dto.skillOnAssignmentId,
      });

      if (!skillOnAssingment) {
        throw new NotFoundException('item not found');
      }

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: skillOnAssingment.subjectId,
        });

      if (!teacherOnSubject && user.role !== 'ADMIN') {
        throw new ForbiddenException("You don't have permission");
      }

      const remove = await this.skillOnAssignmentRepository.delete({
        id: dto.skillOnAssignmentId,
      });

      return remove;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
