import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from './../wheel-of-name/wheel-of-name.service';
import { StudentRepository } from './../student/student.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { ScoreOnSubjectRepository } from './../score-on-subject/score-on-subject.repository';
import { SubjectRepository, SubjectRepositoryType } from './subject.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Student,
  StudentOnSubject,
  Subject,
  TeacherOnSubject,
  User,
} from '@prisma/client';
import { NotFoundError } from 'rxjs';
import { Pagination } from '../interfaces';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  GetSubjectByIdDto,
  GetSubjectByPageDto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
} from './dto';
import * as crypto from 'crypto';
import { ClassRepository } from '../class/class.repository';
import { StudentOnSubjectRepository } from '../student-on-subject/student-on-subject.repository';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
@Injectable()
export class SubjectService {
  logger: Logger = new Logger(SubjectService.name);
  subjectRepository: SubjectRepository = new SubjectRepository(
    this.prisma,
    this.googleStorageService,
  );
  private scoreOnSubjectRepository: ScoreOnSubjectRepository;
  private classRepository: ClassRepository = new ClassRepository(this.prisma);
  private studentRepository: StudentRepository = new StudentRepository(
    this.prisma,
  );
  private studentOnSubjectRepository: StudentOnSubjectRepository =
    new StudentOnSubjectRepository(this.prisma, this.googleStorageService);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private wheelOfNameService: WheelOfNameService,
    private attendanceTableService: AttendanceTableService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.scoreOnSubjectRepository = new ScoreOnSubjectRepository(prisma);
  }

  async getSubjectById(
    dto: GetSubjectByIdDto,
    user?: User,
    student?: Student,
  ): Promise<Subject> {
    try {
      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: dto.subjectId,
        });
      }

      if (student) {
        const studentOnSubject =
          await this.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: dto.subjectId,
              studentId: student.id,
            },
          });
        if (!studentOnSubject) {
          throw new ForbiddenException(
            "Student doesn't belong to this subject",
          );
        }
      }

      return await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectsThatStudentBelongTo(
    dto: { studentId: string; eduYear: string },
    studentUser: Student,
  ): Promise<Subject[]> {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (studentUser.id !== student.id) {
        throw new ForbiddenException('Forbidden access');
      }
      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: {
          studentId: student.id,
        },
      });
      const subjects = await this.subjectRepository.findMany({
        where: {
          id: {
            in: studentOnSubjects.map(
              (studentOnSubject) => studentOnSubject.subjectId,
            ),
          },
          educationYear: dto.eduYear,
        },
      });

      return subjects;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectWithTeacherAndStudent(dto: {
    code?: string;
    subjectId?: string;
  }): Promise<
    Subject & {
      studentOnSubjects: StudentOnSubject[];
      teacherOnSubjects: TeacherOnSubject[];
    }
  > {
    try {
      const subject = await this.subjectRepository.findUnique({
        where: {
          ...(dto.code && { code: dto.code }),
          ...(dto.subjectId && { id: dto.subjectId }),
        },
      });
      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      const [students, teachers] = await Promise.all([
        this.studentOnSubjectRepository.findMany({
          where: {
            subjectId: subject.id,
          },
        }),
        this.teacherOnSubjectService.teacherOnSubjectRepository.findMany({
          where: {
            subjectId: subject.id,
          },
        }),
      ]);

      return {
        ...subject,
        studentOnSubjects: students,
        teacherOnSubjects: teachers,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectByPage(
    dto: GetSubjectByPageDto,
    user: User,
  ): Promise<Pagination<Subject>> {
    try {
      const educationYear = dto.eduYear;
      delete dto.eduYear;

      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException('Access denied');
      }

      const teacherOnSubjects = await this.prisma.teacherOnSubject.findMany({
        where: {
          userId: user.id,
          status: 'ACCEPT',
        },
      });

      const queryTitles = teacherOnSubjects.map((teacherOnSubject) => {
        return {
          id: teacherOnSubject.subjectId,
          title: {
            contains: dto.search,
          },
        };
      });

      const queryDescriptions = teacherOnSubjects.map((teacherOnSubject) => {
        return {
          id: teacherOnSubject.subjectId,
          title: {
            contains: dto.search,
          },
        };
      });

      const counts = await this.prisma.subject.count({
        where: {
          schoolId: dto.schoolId,
          educationYear: educationYear,
          OR: [...queryTitles, ...queryDescriptions],
        },
      });

      const totalPages = Math.ceil(counts / dto.limit);
      if (dto.page > totalPages) {
        return {
          data: [],
          meta: {
            total: 1,
            lastPage: 1,
            currentPage: 1,
            prev: 1,
            next: 1,
          },
        };
      }

      const skip = (dto.page - 1) * dto.limit;

      const subjects = await this.prisma.subject.findMany({
        where: {
          schoolId: dto.schoolId,
          educationYear: educationYear,
          OR: [...queryTitles, ...queryDescriptions],
        },
        skip,
        take: dto.limit,
      });

      return {
        data: subjects,
        meta: {
          total: totalPages,
          lastPage: totalPages,
          currentPage: dto.page,
          prev: dto.page - 1 < 0 ? dto.page : dto.page - 1,
          next: dto.page + 1 > totalPages ? dto.page : dto.page + 1,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSubject(dto: CreateSubjectDto, user: User): Promise<Subject> {
    try {
      const educationYear = dto.eduYear;
      delete dto.eduYear;
      const [memberOnSchool, classroom, totalSubject] = await Promise.all([
        this.prisma.memberOnSchool.findFirst({
          where: {
            userId: user.id,
            schoolId: dto.schoolId,
          },
        }),
        this.classRepository.findById({
          classId: dto.classId,
        }),
        this.prisma.subject.count({
          where: {
            userId: user.id,
            educationYear: educationYear,
          },
        }),
      ]);

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      if (!memberOnSchool) {
        throw new ForbiddenException('Access denied');
      }
      if (classroom.schoolId !== memberOnSchool.schoolId) {
        throw new ForbiddenException("Class doesn't belong to this school");
      }

      const students = await this.studentRepository.findByClassId({
        classId: dto.classId,
      });

      const code = crypto.randomBytes(3).toString('hex');
      let subject = await this.subjectRepository.createSubject({
        ...dto,
        educationYear: educationYear,
        code,
        userId: user.id,
        order: totalSubject + 1,
      });

      const studentOnSubjectCreates = students.map((student) => {
        return {
          title: student.title,
          firstName: student.firstName,
          lastName: student.lastName,
          photo: student.photo,
          blurHash: student.blurHash,
          number: student.number,
          studentId: student.id,
          classId: student.classId,
          subjectId: subject.id,
          schoolId: student.schoolId,
        };
      });

      await this.studentOnSubjectRepository.createMany({
        data: studentOnSubjectCreates,
      });

      await this.wheelOfNameService
        .create({
          title: subject.title,
          description: subject.description,
          texts: students.map((student) => {
            return {
              text: `${student.title} ${student.firstName} ${student.lastName}`,
            };
          }),
        })
        .then(async (wheel) => {
          subject = await this.subjectRepository.update({
            where: {
              id: subject.id,
            },
            data: {
              wheelOfNamePath: wheel.data.path,
            },
          });
        })
        .catch((error) => {
          this.logger.error(error);
        });

      const scoreOnSubjectTitlesDefault = [
        {
          title: 'Good Job',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Good-job.svg',
          blurHash: 'UEO{GV?D05-m~9WDIqah0NWV08M~X_ows.ov',
          score: 1,
        },
        {
          title: 'Well Done',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Well-Done.svg',
          blurHash: 'UlMi|;xpE4n+IrWDs.bFIqahE5bY~QovIrjI',
          score: 1,
        },
        {
          title: 'Keep It Up',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Keep-It-Up.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: 1,
        },
        {
          title: 'Excellent',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Excellent.svg',
          blurHash: 'UAP63q^z06?C^}WCM~a#05WC07Ir~jt5E4oe',
          score: 1,
        },
        {
          title: 'Needs Improvement',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Needs-Improvement.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: -1,
        },
      ];

      await this.prisma.teacherOnSubject.create({
        data: {
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: 'ADMIN',
          status: 'ACCEPT',
          photo: user.photo,
          subjectId: subject.id,
          schoolId: dto.schoolId,
        },
      });
      await Promise.all([
        this.attendanceTableService.createAttendanceTable(
          {
            title: 'Default',
            description: 'Attendance table for ' + subject.title,
            subjectId: subject.id,
          },
          user,
        ),
        ...scoreOnSubjectTitlesDefault.map((score) =>
          this.scoreOnSubjectRepository.createSocreOnSubject({
            title: score.title,
            icon: score.icon,
            subjectId: subject.id,
            score: score.score,
            schoolId: dto.schoolId,
            blurHash: score.blurHash,
          }),
        ),
      ]);

      return subject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateSubject(dto: UpdateSubjectDto, user: User): Promise<Subject> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.query.subjectId,
      });
      let educationYear = dto.body.eduYear;

      if (educationYear) {
        delete dto.body.eduYear;
      }

      return await this.subjectRepository.update({
        where: {
          id: dto.query.subjectId,
        },
        data: { ...dto.body, ...(educationYear && { educationYear }) },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorderSubjects(
    dto: ReorderSubjectsDto,
    user: User,
  ): Promise<Subject[]> {
    try {
      const educationYear = dto.eduYear;
      delete dto.eduYear;
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool && user.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied');
      }
      const subjects = await this.prisma.subject.findMany({
        where: {
          id: {
            in: dto.subjectIds,
          },
          educationYear: educationYear,
        },
      });

      if (subjects.length !== dto.subjectIds.length) {
        throw new NotFoundException('Subject not found');
      }

      subjects.forEach((subject) => {
        if (!subject.id) {
          throw new NotFoundException("Subject doesn't have id");
        }
        if (subject.userId !== user.id) {
          throw new ForbiddenException(
            'You do not have access to this subject',
          );
        }
      });

      return await this.subjectRepository.reorderSubjects({
        subjectIds: dto.subjectIds,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteSubject(
    dto: DeleteSubjectDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const teacer = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      if (teacer.role !== 'ADMIN') {
        throw new ForbiddenException('You do not have access to this subject');
      }

      return await this.subjectRepository.deleteSubject({
        subjectId: dto.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
