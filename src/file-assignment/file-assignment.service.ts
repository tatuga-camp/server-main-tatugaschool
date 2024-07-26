import { AssignmentRepository } from './../assignment/assignment.repository';
import { FileAssignmentRepository } from './file-assignment.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFileOnAssignmentDto,
  DeleteFileAssignmentDto,
  GetFileOnAssignmentByAssignmentIdDto,
} from './dto';
import { FileOnAssignment, User } from '@prisma/client';
import { TeacherOnSubjectRepository } from '../teacher-on-subject/teacher-on-subject.repository';

@Injectable()
export class FileAssignmentService {
  logger: Logger = new Logger(FileAssignmentService.name);
  fileAssignmentRepository: FileAssignmentRepository =
    new FileAssignmentRepository(this.prisma, this.googleStorageService);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
  );
  teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getFilesByAssignmentId(
    dto: GetFileOnAssignmentByAssignmentIdDto,
    user: User,
  ): Promise<FileOnAssignment[]> {
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

      return await this.fileAssignmentRepository.getByAssignmentId({
        assignmentId: dto.assignmentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFileAssignment(
    dto: CreateFileOnAssignmentDto,
    user: User,
  ): Promise<FileOnAssignment> {
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

      return await this.fileAssignmentRepository.create({
        ...dto,
        schoolId: assignment.schoolId,
        subjectId: assignment.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFileAssignment(
    dto: DeleteFileAssignmentDto,
    user: User,
  ): Promise<void> {
    try {
      const fileOnAssignment = await this.fileAssignmentRepository.getById({
        fileOnAssignmentId: dto.fileOnAssignmentId,
      });
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: fileOnAssignment.assignmentId,
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

      await this.fileAssignmentRepository.delete({
        fileOnAssignmentId: dto.fileOnAssignmentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
