import { ClassService } from './../class/class.service';
import { SubjectService } from './../subject/subject.service';
import { SchoolService } from './../school/school.service';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { FileAssignmentRepository } from './file-assignment.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  ForbiddenException,
  forwardRef,
  Inject,
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
import { SchoolRepository } from '../school/school.repository';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class FileAssignmentService {
  private logger: Logger = new Logger(FileAssignmentService.name);
  fileAssignmentRepository: FileAssignmentRepository;
  private assignmentRepository: AssignmentRepository;
  private schoolRepository: SchoolRepository;
  private teacherOnSubjectRepository: TeacherOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    @Inject(forwardRef(() => SubjectService))
    private subjectService: SubjectService,
    private classService: ClassService,
    private stripe: StripeService,
  ) {
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
    );
    this.schoolRepository = new SchoolRepository(
      this.prisma,
      this.googleStorageService,
      this.subjectService,
      this.classService,
      this.stripe,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.fileAssignmentRepository = new FileAssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async getFilesByAssignmentId(
    dto: GetFileOnAssignmentByAssignmentIdDto,
    user: User,
  ): Promise<FileOnAssignment[]> {
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
      const type = dto.type.split('/')[0];
      const assignment = await this.assignmentRepository.getById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      if (type === 'image' && !dto.blurHash) {
        throw new NotFoundException('BlurHash is required for image type');
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

      const create = await this.fileAssignmentRepository.create({
        ...dto,
        schoolId: assignment.schoolId,
        subjectId: assignment.subjectId,
      });

      const school = await this.schoolRepository.getById({
        schoolId: assignment.schoolId,
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      await this.schoolRepository.update({
        where: {
          id: school.id,
        },
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

  async deleteFileAssignment(
    dto: DeleteFileAssignmentDto,
    user: User,
  ): Promise<FileOnAssignment> {
    try {
      const fileOnAssignment = await this.fileAssignmentRepository.getById({
        fileOnAssignmentId: dto.fileOnAssignmentId,
      });

      if (!fileOnAssignment) {
        throw new NotFoundException('File not found');
      }
      const assignment = await this.assignmentRepository.getById({
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

      const school = await this.schoolRepository.getById({
        schoolId: assignment.schoolId,
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      await this.schoolRepository.update({
        where: {
          id: school.id,
        },
        data: {
          totalStorage: school.totalStorage - fileOnAssignment.size,
        },
      });

      return fileOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
