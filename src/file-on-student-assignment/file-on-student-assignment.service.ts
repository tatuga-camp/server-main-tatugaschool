import { AssignmentRepository } from './../assignment/assignment.repository';
import { DeleteFileOnStudentAssignmentDto } from './dto/delete-file.dto';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { FileOnStudentAssignmentRepository } from './file-on-student-assignment.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFileOnStudentAssignmentDto,
  GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
} from './dto';

@Injectable()
export class FileOnStudentAssignmentService {
  logger: Logger = new Logger(FileOnStudentAssignmentService.name);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
  );
  fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository =
    new FileOnStudentAssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getFileByStudentOnAssignmentId(
    dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
  ) {
    try {
      return this.fileOnStudentAssignmentRepository.getByStudentOnAssignmentId(
        dto,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFileOnStudentAssignment(dto: CreateFileOnStudentAssignmentDto) {
    try {
      const studnetOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      return this.fileOnStudentAssignmentRepository.create({
        ...dto,
        schoolId: studnetOnAssignment.schoolId,
        subjectId: studnetOnAssignment.subjectId,
        assignmentId: studnetOnAssignment.assignmentId,
        studentId: studnetOnAssignment.studentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFileOnStudentAssignment(dto: DeleteFileOnStudentAssignmentDto) {
    try {
      const fileOnStudentAssignment =
        await this.fileOnStudentAssignmentRepository.getById({
          fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
        });

      if (!fileOnStudentAssignment) {
        throw new NotFoundException('File not found');
      }
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: fileOnStudentAssignment.studentOnAssignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      if (assignment.isAllowDeleteWork === false) {
        throw new NotFoundException(
          'This assignment is not allow to delete work',
        );
      }
      return this.fileOnStudentAssignmentRepository.delete({
        fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
