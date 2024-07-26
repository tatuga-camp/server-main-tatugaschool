import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
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
  logger: Logger = new Logger(AssignmentService.name);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
  );
  teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  memberOnSchoolRepository: MemberOnSchoolRepository =
    new MemberOnSchoolRepository(this.prisma);
  constructor(private prisma: PrismaService) {}

  async getAssignmentById(
    dto: GetAssignmentByIdDto,
    user: User,
  ): Promise<Assignment> {
    try {
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: dto.assignmentId,
      });

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            userId: user.id,
            schoolId: assignment.schoolId,
          },
        );
      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this assignment',
        );
      }

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
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: dto.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            userId: user.id,
            schoolId: teacherOnSubject.schoolId,
          },
        );
      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this assignment',
        );
      }

      return await this.assignmentRepository.getAssignmentBySubjectId({
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
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: dto.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException(
          'You are not allowed to access this assignment',
        );
      }

      return await this.assignmentRepository.createAssignment({
        ...dto,
        schoolId: teacherOnSubject.schoolId,
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
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: dto.query.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException(
          'You are not allowed to access this assignment',
        );
      }

      return await this.assignmentRepository.updateAssignment({
        query: dto.query,
        data: dto.data,
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

      if (!teacherOnSubject) {
        throw new ForbiddenException(
          'You are not allowed to access this assignment',
        );
      }

      return await this.assignmentRepository.deleteAssignment(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
