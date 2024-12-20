import { SubjectRepository } from './../subject/subject.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { SchoolRepository } from './../school/school.repository';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { DeleteFileOnStudentAssignmentDto } from './dto/delete-file.dto';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { FileOnStudentAssignmentRepository } from './file-on-student-assignment.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFileOnStudentAssignmentDto,
  GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
} from './dto';
import { Student, User } from '@prisma/client';

@Injectable()
export class FileOnStudentAssignmentService {
  private logger: Logger = new Logger(FileOnStudentAssignmentService.name);
  private assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
    this.googleStorageService,
  );
  private teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  private schoolRepository: SchoolRepository = new SchoolRepository(
    this.prisma,
    this.googleStorageService,
  );
  private subjectRepository: SubjectRepository = new SubjectRepository(
    this.prisma,
    this.googleStorageService,
  );
  fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository =
    new FileOnStudentAssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  private studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getFileByStudentOnAssignmentIdFromStudent(
    dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
    student: Student,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (studentOnAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.fileOnStudentAssignmentRepository.getByStudentOnAssignmentId(
        dto,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getFileByStudentOnAssignmentIdFromTeacher(
    dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
    user: User,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('Student on assignment not found');
      }

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: studentOnAssignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.fileOnStudentAssignmentRepository.getByStudentOnAssignmentId(
        dto,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFileOnStudentAssignmentFromStudent(
    dto: CreateFileOnStudentAssignmentDto,
    student: Student,
  ) {
    try {
      const type = dto.type.split('/')[0];

      if (type === 'image' && !dto.blurHash) {
        throw new BadRequestException('BlurHash is required for image type');
      }
      const studnetOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      const assignment = await this.assignmentRepository.getById({
        assignmentId: studnetOnAssignment.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }
      if (!studnetOnAssignment) {
        throw new NotFoundException('Student on assignment not found');
      }

      if (studnetOnAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }

      const create = await this.fileOnStudentAssignmentRepository.create({
        ...dto,
        schoolId: studnetOnAssignment.schoolId,
        subjectId: studnetOnAssignment.subjectId,
        assignmentId: studnetOnAssignment.assignmentId,
        studentId: studnetOnAssignment.studentId,
      });

      const school = await this.schoolRepository.getById({
        schoolId: studnetOnAssignment.schoolId,
      });

      await this.schoolRepository.update({
        query: { schoolId: studnetOnAssignment.schoolId },
        body: {
          totalStorage: school.totalStorage + create.size,
        },
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFileOnStudentAssignmentFromStudnet(
    dto: DeleteFileOnStudentAssignmentDto,
    student: Student,
  ) {
    try {
      const fileOnStudentAssignment =
        await this.fileOnStudentAssignmentRepository.getById({
          fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
        });

      if (!fileOnStudentAssignment) {
        throw new NotFoundException('File not found');
      }

      if (fileOnStudentAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }
      const assignment = await this.assignmentRepository.getById({
        assignmentId: fileOnStudentAssignment.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const subject = await this.subjectRepository.getSubjectById({
        subjectId: fileOnStudentAssignment.subjectId,
      });

      if (subject.allowStudentDeleteWork === false) {
        throw new ForbiddenException(
          'This assignment is not allow to delete work',
        );
      }
      const deleteFile = await this.fileOnStudentAssignmentRepository.delete({
        fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
      });

      const school = await this.schoolRepository.getById({
        schoolId: fileOnStudentAssignment.schoolId,
      });

      await this.schoolRepository.update({
        query: { schoolId: fileOnStudentAssignment.schoolId },
        body: {
          totalStorage: school.totalStorage - fileOnStudentAssignment.size,
        },
      });

      return deleteFile;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFileOnStudentAssignmentFromTeacher(
    dto: DeleteFileOnStudentAssignmentDto,
    user: User,
  ) {
    try {
      const fileOnStudentAssignment =
        await this.fileOnStudentAssignmentRepository.getById({
          fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
        });

      if (!fileOnStudentAssignment) {
        throw new NotFoundException('File not found');
      }

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: fileOnStudentAssignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }

      const deleteFile = await this.fileOnStudentAssignmentRepository.delete({
        fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
      });

      const school = await this.schoolRepository.getById({
        schoolId: fileOnStudentAssignment.schoolId,
      });

      await this.schoolRepository.update({
        query: { schoolId: fileOnStudentAssignment.schoolId },
        body: {
          totalStorage: school.totalStorage - fileOnStudentAssignment.size,
        },
      });

      return deleteFile;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
