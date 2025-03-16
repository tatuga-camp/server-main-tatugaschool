import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { StripeService } from './../stripe/stripe.service';
import { ClassService } from './../class/class.service';
import { SubjectService } from './../subject/subject.service';
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
import { FileOnStudentAssignment, Student, User } from '@prisma/client';

@Injectable()
export class FileOnStudentAssignmentService {
  private logger: Logger = new Logger(FileOnStudentAssignmentService.name);
  private assignmentRepository: AssignmentRepository;
  private teacherOnSubjectRepository: TeacherOnSubjectRepository;
  private schoolRepository: SchoolRepository;
  fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository;
  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private subjectService: SubjectService,
    private classService: ClassService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private stripe: StripeService,
  ) {
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.fileOnStudentAssignmentRepository =
      new FileOnStudentAssignmentRepository(
        this.prisma,
        this.googleStorageService,
      );
    this.schoolRepository = new SchoolRepository(
      this.prisma,
      this.googleStorageService,
      this.subjectService,
      this.classService,
      this.stripe,
    );
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

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
        data: {
          ...dto,
          schoolId: studnetOnAssignment.schoolId,
          subjectId: studnetOnAssignment.subjectId,
          assignmentId: studnetOnAssignment.assignmentId,
          studentId: studnetOnAssignment.studentId,
        },
      });

      const school = await this.schoolRepository.getById({
        schoolId: studnetOnAssignment.schoolId,
      });

      await this.schoolRepository.update({
        where: { id: studnetOnAssignment.schoolId },
        data: {
          totalStorage: school.totalStorage + create.size,
        },
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateFile(
    dto: { query: { id: string }; body: { body?: string; name?: string } },
    user: User | null,
    student: Student | null,
  ) {
    try {
      const file = await this.fileOnStudentAssignmentRepository.getById({
        fileOnStudentAssignmentId: dto.query.id,
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      if (user) {
        const teacherOnSubject =
          await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
            teacherId: user.id,
            subjectId: file.subjectId,
          });

        if (!teacherOnSubject) {
          throw new ForbiddenException("You don't have permission to access");
        }
      }

      if (student && file.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }

      const update = await this.fileOnStudentAssignmentRepository.update({
        where: { id: dto.query.id },
        data: dto.body,
      });

      if (file.contentType === 'FILE' && dto.body.body !== file.body) {
        await this.googleStorageService.DeleteFileOnStorage({
          fileName: file.body,
        });
      }

      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteFileOnStudentAssignmentDto,
    user?: User | null,
    student?: Student,
  ): Promise<FileOnStudentAssignment> {
    try {
      const fileOnStudentAssignment =
        await this.fileOnStudentAssignmentRepository.getById({
          fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
        });

      if (!fileOnStudentAssignment) {
        throw new NotFoundException('File not found');
      }

      if (student && fileOnStudentAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }

      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: fileOnStudentAssignment.subjectId,
        });
      }

      const assignment = await this.assignmentRepository.getById({
        assignmentId: fileOnStudentAssignment.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const subject =
        await this.subjectService.subjectRepository.getSubjectById({
          subjectId: fileOnStudentAssignment.subjectId,
        });

      if (student && subject.allowStudentDeleteWork === false) {
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
        where: { id: fileOnStudentAssignment.schoolId },
        data: {
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
