import { RedisService } from './../redis/redis.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  FileOnStudentAssignment,
  Student,
  StudentOnAssignment,
  User,
} from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StudentRepository } from '../student/student.repository';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { PushService } from '../web-push/push.service';
import {
  StudentSafeSubmission,
  toStudentSafeSubmission,
} from '../quiz/student-question.mapper';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { FileOnStudentAssignmentRepository } from './../file-on-student-assignment/file-on-student-assignment.repository';
import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { SkillOnStudentAssignmentService } from './../skill-on-student-assignment/skill-on-student-assignment.service';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import {
  CreateStudentOnAssignmentDto,
  DeleteStudentOnAssignmentDto,
  GetStudentOnAssignmentByAssignmentIdDto,
  GetStudentOnAssignmentByStudentIdDto,
  UpdateStudentOnAssignmentDto,
} from './dto';
import { StudentOnAssignmentRepository } from './student-on-assignment.repository';
import { LineBotService } from '../line-bot/line-bot.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';
import { CacheService } from '../cache/cache.service';
import { CacheRefs } from '../cache/cache-refs';
import { AssignmentReads } from '../assignment/assignment.reads';
import { assertSubmissionLive } from '../assignment/submission-live';

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
  refs: CacheRefs;
  reads: AssignmentReads;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private pushService: PushService,
    private skillOnStudentAssignmentService: SkillOnStudentAssignmentService,
    private notificationService: NotificationService,
    private line: LineBotService,
    private prismaReadService: PrismaReadService,
    private redisService: RedisService,
    private cache: CacheService,
  ) {
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.storageService,
      this.prismaReadService,
      this.cache,
    );
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.storageService,
      this.cache,
      this.prismaReadService,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
      this.cache,
    );
    this.teacherOnSubjectRepository = new TeacherOnSubjectRepository(
      this.prisma,
      this.cache,
    );
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(
      this.prisma,
      this.cache,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.storageService,
      this.cache,
    );
    this.fileOnStudentAssignmentRepository =
      new FileOnStudentAssignmentRepository(
        this.prisma,
        this.storageService,
        this.cache,
      );
    this.refs = new CacheRefs(this.prisma, this.cache);
    this.reads = new AssignmentReads(this.prisma, this.cache);
  }

  async getById(
    dto: { id: string },
    student: StudentJwtPayload,
  ): Promise<StudentSafeSubmission<StudentOnAssignment>> {
    try {
      await assertSubmissionLive(this.prisma, dto.id);
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

      return toStudentSafeSubmission(studentOnAssignment);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByAssignmentId(
    dto: GetStudentOnAssignmentByAssignmentIdDto,
    user: UserJwtPayload,
  ): Promise<(StudentOnAssignment & { files: FileOnStudentAssignment[] })[]> {
    try {
      const ref = await this.refs.assignment(dto.assignmentId);
      if (!ref) {
        throw new NotFoundException('Assignment not found');
      }
      // Authorize on every request, before reading any cached subject data.
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: ref.subjectId,
      });
      // The immutable ref outlives a deleted assignment; the assignments unit does not.
      const { assignments } = await this.reads.subjectAssignments(
        ref.subjectId,
      );
      if (!assignments.some((a) => a.id === dto.assignmentId)) {
        throw new NotFoundException('Assignment not found');
      }
      return await this.reads.assignmentSubmissions(
        ref.subjectId,
        dto.assignmentId,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByStudentId(
    dto: GetStudentOnAssignmentByStudentIdDto,
    user: UserJwtPayload,
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
    user: UserJwtPayload,
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
    user?: UserJwtPayload | undefined,
    student?: StudentJwtPayload | undefined,
  ): Promise<StudentOnAssignment | StudentSafeSubmission<StudentOnAssignment>> {
    try {
      await assertSubmissionLive(this.prisma, dto.query.studentOnAssignmentId);
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
        if (assignment.type === 'Quiz') {
          throw new ForbiddenException(
            'Quiz answers are submitted through the quiz endpoints',
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
        await this.notificationService
          .createNotifications({
            type: 'STUDENT_SUBMISSION',
            message: `${studentOnAssignment.title} ${studentOnAssignment.firstName} ${studentOnAssignment.lastName} has submitted an assignment`,
            link: url,
            userIds: teachers.map((t) => t.userId),
            actorImage: studentOnAssignment.photo,
            subjectId: studentOnAssignment.subjectId,
            schoolId: studentOnAssignment.schoolId,
            actorId: studentOnAssignment.studentId,
            actorName: `${studentOnAssignment.title} ${studentOnAssignment.firstName} ${studentOnAssignment.lastName}`,
          })
          .catch((err) => {
            this.logger.error('Failed to create notification', err);
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
        this.skillOnStudentAssignmentService
          .suggestCreate({
            studentOnAssignmentId: studentOnAssignment.id,
          })
          .catch((err) => {
            this.logger.error(
              'Failed to suggest skill on student assignment',
              err,
            );
          });
      }

      // Student callers never see integrity or risk data; teachers keep the full row.
      return student ? toStudentSafeSubmission(update) : update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteStudentOnAssignmentDto,
    user: UserJwtPayload,
  ): Promise<{ message: string }> {
    try {
      await assertSubmissionLive(this.prisma, dto.studentOnAssignmentId);
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
