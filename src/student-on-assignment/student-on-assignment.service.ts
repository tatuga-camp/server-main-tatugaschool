import { SkillOnStudentAssignmentService } from './../skill-on-student-assignment/skill-on-student-assignment.service';
import { FileOnStudentAssignmentRepository } from './../file-on-student-assignment/file-on-student-assignment.repository';
import { StorageService } from '../storage/storage.service';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import {
  FileOnStudentAssignment,
  Student,
  StudentOnAssignment,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStudentOnAssignmentDto,
  DeleteStudentOnAssignmentDto,
  GetStudentOnAssignmentByAssignmentIdDto,
  GetStudentOnAssignmentByStudentIdDto,
  UpdateStudentOnAssignmentDto,
} from './dto';
import { StudentOnAssignmentRepository } from './student-on-assignment.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentRepository } from '../student/student.repository';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { PushService } from '../web-push/push.service';
import { PushSubscription } from '../web-push/interfaces';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class StudentOnAssignmentService {
  logger: Logger = new Logger(StudentOnAssignmentService.name);
  private studentRepository: StudentRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  studentOnAssignmentRepository: StudentOnAssignmentRepository;
  private teacherOnSubjectRepository: TeacherOnSubjectRepository;
  private memberOnSchoolRepository: MemberOnSchoolRepository;
  private assignmentRepository: AssignmentRepository;
  private fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository;
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private pushService: PushService,
    private skillOnStudentAssignmentService: SkillOnStudentAssignmentService,
    private notificationService: NotificationService,
  ) {
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.storageService,
    );
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.storageService,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
    );
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(this.prisma);
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.storageService,
    );
    this.fileOnStudentAssignmentRepository =
      new FileOnStudentAssignmentRepository(this.prisma, this.storageService);
  }

  async getById(
    dto: { id: string },
    student: Student,
  ): Promise<StudentOnAssignment> {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.id,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('StudentOnAssignment not found');
      }

      if (student.id !== studentOnAssignment.studentId) {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      return studentOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByAssignmentId(
    dto: GetStudentOnAssignmentByAssignmentIdDto,
    user: User,
  ): Promise<(StudentOnAssignment & { files: FileOnStudentAssignment[] })[]> {
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

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: assignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      const studentOnAssignments =
        await this.studentOnAssignmentRepository.getByAssignmentId(dto);
      const files = await this.prisma.fileOnStudentAssignment.findMany({
        where: {
          studentOnAssignmentId: {
            in: studentOnAssignments.map(
              (studentOnAssignment) => studentOnAssignment.id,
            ),
          },
        },
      });
      return studentOnAssignments.map((studentOnAssignment) => ({
        ...studentOnAssignment,
        files: files.filter(
          (file) => file.studentOnAssignmentId === studentOnAssignment.id,
        ),
      }));
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByStudentId(
    dto: GetStudentOnAssignmentByStudentIdDto,
    user: User,
  ): Promise<StudentOnAssignment[]> {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: student.schoolId,
            userId: user.id,
          },
        );

      if (!memberOnSchool) {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      const studentOnAssignments =
        this.studentOnAssignmentRepository.getByStudentId(dto);

      return studentOnAssignments;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: CreateStudentOnAssignmentDto,
    user: User,
  ): Promise<StudentOnAssignment> {
    try {
      const [assignment, studentOnSubject] = await Promise.all([
        this.assignmentRepository.getById({
          assignmentId: dto.assignmentId,
        }),
        this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        }),
      ]);

      if (!assignment || !studentOnSubject) {
        throw new NotFoundException('Assignment Or StudentOnSubject not found');
      }

      const subject = await this.prisma.subject.findUnique({
        where: {
          id: studentOnSubject.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject is invaild');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: assignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      const studentOnAssignment = this.studentOnAssignmentRepository.create({
        title: studentOnSubject.title,
        firstName: studentOnSubject.firstName,
        lastName: studentOnSubject.lastName,
        blurHash: studentOnSubject.blurHash,
        photo: studentOnSubject.photo,
        number: studentOnSubject.number,
        studentId: studentOnSubject.studentId,
        assignmentId: assignment.id,
        studentOnSubjectId: studentOnSubject.id,
        schoolId: studentOnSubject.schoolId,
        subjectId: studentOnSubject.subjectId,
      });
      return studentOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateStudentOnAssignmentDto,
    user?: User | undefined,
    student?: Student | undefined,
  ): Promise<StudentOnAssignment> {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.query.studentOnAssignmentId,
        });

      const assignment = await this.assignmentRepository.getById({
        assignmentId: studentOnAssignment.assignmentId,
      });

      if (!studentOnAssignment) {
        throw new NotFoundException('StudentOnAssignment not found');
      }

      if (studentOnAssignment.status === 'REVIEWD' && student) {
        throw new ForbiddenException('You cannot update a reviewd assignment');
      }

      if (dto.body.score && dto.body.score > assignment.maxScore) {
        throw new BadRequestException('Score must be less than max score');
      }

      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          subjectId: studentOnAssignment.subjectId,
          userId: user.id,
        });

        const subject = await this.prisma.subject.findUnique({
          where: {
            id: studentOnAssignment.subjectId,
          },
        });

        if (!subject) {
          throw new NotFoundException('Subject is invaild');
        }

        if (subject.isLocked === true) {
          throw new ForbiddenException(
            'Subject is locked. Cannot make any changes!',
          );
        }
      }

      if (student) {
        if (studentOnAssignment.isAssigned === false) {
          throw new ForbiddenException(
            'This student is not assigned in this assignment',
          );
        }
        if (student.id !== studentOnAssignment.studentId) {
          throw new ForbiddenException(
            'You are not allowed to access this resource',
          );
        }

        if (assignment.type !== 'VideoQuiz' && dto.body.status === 'REVIEWD') {
          throw new ForbiddenException(
            'You are not allowed to access this resource',
          );
        }

        if (assignment.type !== 'VideoQuiz') {
          delete dto.body?.score;
        }
        delete dto.body?.isAssigned;
      }

      if (dto.body.status === 'SUBMITTED') {
        const params = {
          studentOnAssignmentId: studentOnAssignment.id,
          menu: 'studentwork',
        };
        const urlParams = new URLSearchParams();
        for (const key in params) {
          urlParams.append(key, params[key]);
        }
        const newUrl = `${process.env.CLIENT_URL}/subject/${studentOnAssignment.subjectId}/assignment/${studentOnAssignment.assignmentId}?${urlParams.toString()}`;
        const url = new URL(newUrl);

        const teachers = await this.teacherOnSubjectRepository.findMany({
          where: {
            subjectId: studentOnAssignment.subjectId,
          },
        });
        await this.notificationService.createNotifications({
          type: 'STUDENT_SUBMISSION',
          message: `${studentOnAssignment.title} ${studentOnAssignment.firstName} ${studentOnAssignment.lastName} has submitted an assignment`,
          link: url,
          userIds: teachers.map((t) => t.userId),
          actorImage: studentOnAssignment.photo,
          subjectId: studentOnAssignment.subjectId,
          schoolId: studentOnAssignment.schoolId,
          actorId: studentOnAssignment.studentId,
          actorName: `${studentOnAssignment.title} ${studentOnAssignment.firstName} ${studentOnAssignment.lastName}`,
        });
      }

      let reviewdAt: string | null;
      let completedAt: string | null;
      if (dto.body.status === 'REVIEWD') {
        reviewdAt = new Date().toISOString();
      }
      if (dto.body.status === 'SUBMITTED') {
        completedAt = new Date().toISOString();
      }
      if (dto.body.status === 'PENDDING') {
        reviewdAt = null;
        completedAt = null;
      }
      const update = await this.studentOnAssignmentRepository.update({
        where: { id: dto.query.studentOnAssignmentId },
        data: {
          ...dto.body,
          reviewdAt: reviewdAt,
          completedAt: completedAt,
        },
      });

      if (dto.body.score) {
        this.skillOnStudentAssignmentService.suggestCreate({
          studentOnAssignmentId: studentOnAssignment.id,
        });
      }

      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteStudentOnAssignmentDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('StudentOnAssignment not found');
      }
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: studentOnAssignment.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject is invaild');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: studentOnAssignment.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: studentOnAssignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      return await this.studentOnAssignmentRepository.delete({
        studentOnAssignmentId: dto.studentOnAssignmentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
