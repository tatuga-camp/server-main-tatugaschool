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
import { StorageService } from '../storage/storage.service';
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
import * as archiver from 'archiver';

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
    private storageService: StorageService,
    private subjectService: SubjectService,
    private classService: ClassService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private stripe: StripeService,
  ) {
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.fileOnStudentAssignmentRepository =
      new FileOnStudentAssignmentRepository(this.prisma, this.storageService);
    this.schoolRepository = new SchoolRepository(
      this.prisma,
      this.storageService,
      this.subjectService,
      this.classService,
      this.stripe,
    );
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.storageService,
    );
  }

  async downloadAllFiles(dto: { assignmentId: string }, user: User) {
    try {
      const assignment = await this.assignmentRepository.getById({
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

      if (!teacherOnSubject || teacherOnSubject.status !== 'ACCEPT') {
        throw new ForbiddenException("You don't have permission to access");
      }

      const studentOnAssignments =
        await this.studentOnAssignmentRepository.findMany({
          where: {
            assignmentId: dto.assignmentId,
          },
        });

      // Verify teacher access to all subjects involved
      const subjectIds = [
        ...new Set(studentOnAssignments.map((f) => f.subjectId)),
      ];

      const files = await this.fileOnStudentAssignmentRepository.findMany({
        where: {
          assignmentId: assignment.id,
          contentType: 'FILE',
        },
      });

      const archive = archiver.create('zip', {
        zlib: { level: 9 },
      });

      // Process files in background to allow stream to be returned immediately
      (async () => {
        try {
          await Promise.all(
            files.map(async (file) => {
              try {
                const stream = await this.storageService.getFileStream(
                  file.body,
                );
                let folderName = file.studentOnAssignmentId;
                const student = studentOnAssignments.find(
                  (s) => s.id === file.studentOnAssignmentId,
                );
                if (student) {
                  folderName = `${student.number}_${student.firstName} ${student.lastName}`;
                }
                const fileName =
                  file.name || file.body.split('/').pop() || 'unknown';
                archive.append(stream, { name: `${folderName}/${fileName}` });
              } catch (err) {
                this.logger.error(
                  `Failed to add file ${file.id} to archive`,
                  err,
                );
                archive.append(
                  Buffer.from(`Error downloading file: ${file.body}`),
                  { name: `error_${file.id}.txt` },
                );
              }
            }),
          );
          await archive.finalize();
        } catch (error) {
          this.logger.error('Error creating archive', error);
          archive.abort();
        }
      })();

      return archive;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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
        await this.storageService.DeleteFileOnStorage({
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
          'Students are not allowed to delete files on this subject',
        );
      }
      const deleteFile = await this.fileOnStudentAssignmentRepository.delete({
        fileOnStudentAssignmentId: dto.fileOnStudentAssignmentId,
      });

      await this.schoolRepository.update({
        where: { id: fileOnStudentAssignment.schoolId },
        data: {
          totalStorage: {
            decrement: deleteFile.size,
          },
        },
      });

      return deleteFile;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
