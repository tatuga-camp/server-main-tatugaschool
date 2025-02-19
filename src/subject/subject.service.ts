import { SchoolService } from './../school/school.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Class,
  Student,
  StudentOnSubject,
  Subject,
  TeacherOnSubject,
  User,
} from '@prisma/client';
import * as crypto from 'crypto';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentOnSubjectRepository } from '../student-on-subject/student-on-subject.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { MemberOnSchoolService } from './../member-on-school/member-on-school.service';
import { ScoreOnSubjectRepository } from './../score-on-subject/score-on-subject.repository';
import { StudentRepository } from './../student/student.repository';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from './../wheel-of-name/wheel-of-name.service';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  GetSubjectByIdDto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
} from './dto';
import { SubjectRepository } from './subject.repository';

@Injectable()
export class SubjectService {
  logger: Logger = new Logger(SubjectService.name);
  subjectRepository: SubjectRepository = new SubjectRepository(
    this.prisma,
    this.googleStorageService,
  );
  private scoreOnSubjectRepository: ScoreOnSubjectRepository;
  private studentRepository: StudentRepository = new StudentRepository(
    this.prisma,
    this.googleStorageService,
  );
  private studentOnSubjectRepository: StudentOnSubjectRepository =
    new StudentOnSubjectRepository(this.prisma, this.googleStorageService);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private wheelOfNameService: WheelOfNameService,
    private attendanceTableService: AttendanceTableService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private classroomService: ClassService,
    private memberOnSchoolService: MemberOnSchoolService,
    private SchoolService: SchoolService,
  ) {
    this.scoreOnSubjectRepository = new ScoreOnSubjectRepository(this.prisma);
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

  async getBySchoolId(
    dto: { schoolId: string; educationYear: string },
    user: User,
  ): Promise<(Subject & { teachers: TeacherOnSubject[]; class: Class })[]> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException('Access denied');
      }

      const subjects = await this.subjectRepository.findMany({
        where: {
          schoolId: dto.schoolId,
          educationYear: dto.educationYear,
        },
      });

      const [teachers, classrooms] = await Promise.all([
        this.teacherOnSubjectService.teacherOnSubjectRepository.findMany({
          where: {
            OR: subjects.map((subject) => {
              return {
                subjectId: subject.id,
                status: 'ACCEPT',
              };
            }),
          },
        }),
        this.classroomService.classRepository.findMany({
          where: {
            OR: subjects.map((subject) => {
              return {
                id: subject.classId,
              };
            }),
          },
        }),
      ]);
      return subjects.map((subject) => {
        return {
          ...subject,
          teachers: teachers.filter(
            (teacher) => teacher.subjectId === subject.id,
          ),
          class: classrooms.find(
            (classroom) => classroom.id === subject.classId,
          ),
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectsThatStudentBelongTo(
    dto: { studentId: string; educationYear: string },
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
          educationYear: dto.educationYear,
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

  async createSubject(dto: CreateSubjectDto, user: User): Promise<Subject> {
    let subjectId: string;
    try {
      const school = await this.SchoolService.schoolRepository.getById({
        schoolId: dto.schoolId,
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }
      const educationYear = dto.educationYear;
      delete dto.educationYear;

      const exsitingSubjects = await this.subjectRepository.findMany({
        where: {
          schoolId: school.id,
        },
      });

      await this.SchoolService.ValidateLimit(
        school,
        'subjects',
        exsitingSubjects.length + 1,
      );

      const [memberOnSchool, classroom] = await Promise.all([
        this.prisma.memberOnSchool.findFirst({
          where: {
            userId: user.id,
            schoolId: dto.schoolId,
          },
        }),
        this.classroomService.classRepository.findById({
          classId: dto.classId,
        }),
      ]);

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      await this.classroomService.validateAccess({
        classroom: classroom,
        classId: dto.classId,
      });

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
      });

      subjectId = subject.id;

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

      if (studentOnSubjectCreates.length > 0) {
        await this.studentOnSubjectRepository.createMany({
          data: studentOnSubjectCreates,
        });
      }

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
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Good-job.svg',
          blurHash: 'UEO{GV?D05-m~9WDIqah0NWV08M~X_ows.ov',
          score: 1,
        },
        {
          title: 'Well Done',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Well-Done.svg',
          blurHash: 'UlMi|;xpE4n+IrWDs.bFIqahE5bY~QovIrjI',
          score: 1,
        },
        {
          title: 'Keep It Up',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Keep-It-Up.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: 1,
        },
        {
          title: 'Excellent',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Excellent.svg',
          blurHash: 'UAP63q^z06?C^}WCM~a#05WC07Ir~jt5E4oe',
          score: 1,
        },
        {
          title: 'Needs Improvement',
          icon: 'https://storage.cloud.google.com/public-tatugaschool/Needs-Improvement.svg',
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
      if (subjectId) {
        await this.subjectRepository.deleteSubject({
          subjectId: subjectId,
        });
      }
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
      let educationYear = dto.body.educationYear;

      if (educationYear) {
        delete dto.body.educationYear;
      }
      const subject = await this.subjectRepository.findUnique({
        where: {
          id: dto.query.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.classroomService.validateAccess({
        classId: subject.classId,
      });

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
      const getRandomIdFromArray =
        dto.subjectIds[Math.floor(Math.random() * dto.subjectIds.length)];

      const subject = await this.subjectRepository.findUnique({
        where: {
          id: getRandomIdFromArray,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: subject.schoolId,
      });

      return await this.subjectRepository.reorderSubjects({
        subjectIds: dto.subjectIds,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteSubject(dto: DeleteSubjectDto, user: User): Promise<Subject> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const remove = await this.subjectRepository.deleteSubject({
        subjectId: dto.subjectId,
      });
      return remove;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
