import { AttendanceStatusListService } from './../attendance-status-list/attendance-status-list.service';
import { GradeService } from './../grade/grade.service';
import { SchoolService } from './../school/school.service';
import {
  ForbiddenException,
  forwardRef,
  Inject,
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
import { StorageService } from '../storage/storage.service';
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
  UpdateverifyLineToken,
} from './dto';
import { SubjectRepository } from './subject.repository';
import { AssignmentService } from '../assignment/assignment.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { LineBotService } from '../line-bot/line-bot.service';

@Injectable()
export class SubjectService {
  logger: Logger = new Logger(SubjectService.name);
  subjectRepository: SubjectRepository;
  private scoreOnSubjectRepository: ScoreOnSubjectRepository;
  private studentRepository: StudentRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private wheelOfNameService: WheelOfNameService,
    private attendanceTableService: AttendanceTableService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private classroomService: ClassService,
    @Inject(forwardRef(() => MemberOnSchoolService))
    private memberOnSchoolService: MemberOnSchoolService,
    @Inject(forwardRef(() => SchoolService))
    private schoolService: SchoolService,
    @Inject(forwardRef(() => GradeService))
    private gradeService: GradeService,
    @Inject(forwardRef(() => AssignmentService))
    private assignmentService: AssignmentService,
    private fileAssignmentService: FileAssignmentService,
    private attendanceStatusListService: AttendanceStatusListService,
    private line: LineBotService,
  ) {
    this.scoreOnSubjectRepository = new ScoreOnSubjectRepository(this.prisma);
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.storageService,
    );
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.storageService,
    );
    this.subjectRepository = new SubjectRepository(
      this.prisma,
      this.storageService,
    );
  }

  async leaveGroupLine(request: { groupId: string }): Promise<Subject | void> {
    try {
      const subject = await this.subjectRepository.findFirst({
        where: {
          lineGroupId: request.groupId,
        },
      });

      if (subject) {
        return await this.subjectRepository.update({
          where: {
            id: subject.id,
          },
          data: {
            isVerifyLine: false,
            lineGroupId: null,
          },
        });
      }
    } catch (error) {
      throw error;
    }
  }

  async duplicateSubject(
    dto: {
      subjectId: string;
      classroomId: string;
      title: string;
      description: string;
      educationYear: string;
    },
    user: User,
  ): Promise<Subject> {
    try {
      const subject = await this.subjectRepository.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      const classroom = await this.classroomService.classRepository.findById({
        classId: dto.classroomId,
      });

      if (!subject || !classroom) {
        throw new NotFoundException('Classroom Or Subject not found');
      }

      await this.memberOnSchoolService.validateAccess({
        schoolId: subject.schoolId,
        user: user,
      });

      const assignments =
        await this.assignmentService.assignmentRepository.findMany({
          where: {
            subjectId: subject.id,
          },
        });
      const create = await this.createSubject(
        {
          title: dto.title,
          description: dto.description,
          educationYear: dto.educationYear,
          schoolId: subject.schoolId,
          classId: classroom.id,
          backgroundImage: subject.backgroundImage,
          allowStudentDeleteWork: subject.allowStudentDeleteWork,
          allowStudentViewOverallScore: subject.allowStudentViewOverallScore,
          allowStudentViewGrade: subject.allowStudentViewGrade,
          allowStudentViewAttendance: subject.allowStudentViewAttendance,
          allowStudentViewScoreOnAssignment:
            subject.allowStudentViewScoreOnAssignment,
          allowStudentDoneAssignmentInOrder:
            subject.allowStudentDoneAssignmentInOrder,
          allowHideStudentList: subject.allowHideStudentList,
        },
        user,
      );

      const newAttendanceTables =
        await this.attendanceTableService.attendanceTableRepository.findMany({
          where: {
            subjectId: create.id,
          },
        });

      await Promise.allSettled(
        newAttendanceTables.map((a) =>
          this.attendanceTableService.attendanceTableRepository.deleteAttendanceTable(
            {
              attendanceTableId: a.id,
            },
          ),
        ),
      );

      const oldAttendanceTables =
        await this.attendanceTableService.attendanceTableRepository.findMany({
          where: {
            subjectId: subject.id,
          },
        });

      const status =
        await this.attendanceStatusListService.attendanceStatusListSRepository.findMany(
          {
            where: {
              subjectId: subject.id,
            },
          },
        );

      for (const attendanceTable of oldAttendanceTables) {
        const createAttendanceTable =
          await this.attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: attendanceTable.title,
              subjectId: create.id,
              schoolId: create.schoolId,
              description: attendanceTable.description,
            },
          );
        await Promise.allSettled(
          status
            .filter((s) => s.attendanceTableId === attendanceTable.id)
            .map((s) =>
              this.attendanceStatusListService.attendanceStatusListSRepository.create(
                {
                  data: {
                    title: s.title,
                    color: s.color,
                    subjectId: create.id,
                    value: s.value,
                    schoolId: create.schoolId,
                    attendanceTableId: createAttendanceTable.id,
                  },
                },
              ),
            ),
        );
      }
      if (assignments.length > 0) {
        await Promise.all(
          assignments.map(async (assignment) => {
            const newAssignment = await this.assignmentService.createAssignment(
              {
                title: assignment.title,
                type: assignment.type,
                description: assignment.description,
                ...(assignment.dueDate && {
                  dueDate: assignment.dueDate.toISOString(),
                }),
                ...(assignment.beginDate && {
                  beginDate: assignment.beginDate.toISOString(),
                }),
                subjectId: create.id,
                status: assignment.status,
                order: assignment.order,
                maxScore: assignment.maxScore,
                videoURL: assignment.videoURL,
              },
              user,
            );

            const filesOnAssignments =
              await this.fileAssignmentService.fileAssignmentRepository.findMany(
                {
                  where: {
                    assignmentId: assignment.id,
                  },
                },
              );
            const questionsOnVideo = await this.prisma.questionOnVideo.findMany(
              {
                where: {
                  assignmentId: assignment.id,
                },
              },
            );
            if (filesOnAssignments.length > 0) {
              await Promise.allSettled(
                filesOnAssignments.map((file) =>
                  this.fileAssignmentService.fileAssignmentRepository.create({
                    type: file.type,
                    blurHash: file.blurHash,
                    subjectId: create.id,
                    url: file.url,
                    size: file.size,
                    schoolId: create.schoolId,
                    assignmentId: newAssignment.id,
                  }),
                ),
              );
            }

            if (questionsOnVideo.length > 0) {
              await Promise.allSettled(
                questionsOnVideo.map((question) =>
                  this.prisma.questionOnVideo.create({
                    data: {
                      assignmentId: newAssignment.id,
                      question: question.question,
                      options: question.options,
                      correctOptions: question.correctOptions,
                      timestamp: question.timestamp,
                      subjectId: create.id,
                    },
                  }),
                ),
              );
            }
            return newAssignment;
          }),
        );
      }
      return subject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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

      let subject = await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });

      if (user) {
        await this.wheelOfNameService
          .get({
            path: subject.wheelOfNamePath,
          })
          .catch(async (error) => {
            if (error?.response?.status === 404) {
              const studentOnSubjects =
                await this.studentOnSubjectRepository.getStudentOnSubjectsBySubjectId(
                  {
                    subjectId: subject.id,
                  },
                );

              const create = await this.wheelOfNameService.create({
                title: subject.title,
                description: subject.description,
                texts: studentOnSubjects.map((student) => {
                  return {
                    text: `${student.title} ${student.firstName} ${student.lastName}`,
                  };
                }),
              });

              subject = await this.subjectRepository.update({
                where: {
                  id: subject.id,
                },
                data: {
                  wheelOfNamePath: create.data.path,
                },
              });
            }
          });
      }

      return subject;
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
      const school = await this.schoolService.schoolRepository.getById({
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

      await this.schoolService.ValidateLimit(
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
          order: Number(student.number),
        };
      });

      if (studentOnSubjectCreates.length > 0) {
        await this.studentOnSubjectRepository.createMany({
          data: studentOnSubjectCreates,
        });
      }

      const scoreOnSubjectTitlesDefault = [
        {
          title: 'Good Job',
          icon: 'https://storage.googleapis.com/public-tatugaschool/Good-job.png',
          blurHash: 'UEO{GV?D05-m~9WDIqah0NWV08M~X_ows.ov',
          score: 1,
        },
        {
          title: 'Well Done',
          icon: 'https://storage.googleapis.com/public-tatugaschool/Well-Done.png',
          blurHash: 'UlMi|;xpE4n+IrWDs.bFIqahE5bY~QovIrjI',
          score: 1,
        },
        {
          title: 'Keep It Up',
          icon: 'https://storage.googleapis.com/public-tatugaschool/Keep-It-Up.png',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: 1,
        },
        {
          title: 'Excellent',
          icon: 'https://storage.googleapis.com/public-tatugaschool/Excellent.png',
          blurHash: 'UAP63q^z06?C^}WCM~a#05WC07Ir~jt5E4oe',
          score: 1,
        },
        {
          title: 'Needs Improvement',
          icon: 'https://storage.googleapis.com/public-tatugaschool/Needs-Improvement.png',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
          score: -1,
        },
      ];

      const gradeRule = [
        {
          min: 80,
          max: 100,
          grade: '4',
        },
        {
          min: 75,
          max: 79,
          grade: '3.5',
        },
        {
          min: 70,
          max: 74,
          grade: '3',
        },
        {
          min: 65,
          max: 69,
          grade: '2.5',
        },
        {
          min: 60,
          max: 64,
          grade: '2',
        },
        {
          min: 55,
          max: 59,
          grade: '1.5',
        },
        {
          min: 50,
          max: 54,
          grade: '1',
        },
        {
          min: 0,
          max: 49,
          grade: '0',
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
        this.gradeService.gradeRepository.create({
          data: {
            subjectId: subject.id,
            schoolId: subject.schoolId,
            gradeRules: JSON.stringify(gradeRule),
          },
        }),
        this.wheelOfNameService
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
          }),
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

  async verifyLineToken(dto: UpdateverifyLineToken, user: User) {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const subject = await this.subjectRepository.findUnique({
        where: { id: dto.subjectId },
      });

      if (!subject) {
        throw new ForbiddenException('Invalid subject');
      }

      if (dto.confirm === false) {
        return await this.leaveGroupLine({ groupId: subject.lineGroupId });
      }

      if (!subject || subject.verifyLineToken !== dto.token) {
        throw new ForbiddenException('Expired line token');
      }

      const updatedSubject = await this.subjectRepository.update({
        where: { id: dto.subjectId },
        data: {
          isVerifyLine: true,
          verifyLineToken: null,
        },
      });

      await this.line.sendMessage({
        groupId: updatedSubject.lineGroupId,
        message:
          '🎉 เชื่อมต่อราย Tatuga School สำเร็จแล้ว! 🏫✨\n\n' +
          `กลุ่มนี้ได้รับการเชื่อมต่อกับรายวิชา ${updatedSubject.title} เรียบร้อยแล้วครับ/ค่ะ ต่อจากนี้ระบบจะช่วยอัปเดตข้อมูลให้ดังนี้:\n` +
          '🔔 แจ้งเตือนทันที: เมื่อมีนักเรียนส่งการบ้าน\n' +
          '⏰ สรุปยามเช้า (08:30 น.): รายชื่อนักเรียนที่ยังไม่ได้ส่งงาน\n\n' +
          '---\n\n' +
          '🎉 Successfully connected to Tatuga School! 🏫✨\n\n' +
          'This group is now linked to your course. From now on, you will receive:\n' +
          '🔔 Real-time alerts: Whenever a student submits their work.\n' +
          "⏰ Morning Briefing (08:30 AM): A daily summary of students who haven't submitted their assignments yet.\n\n" +
          '🚀 ยินดีต้อนรับสู่ห้องเรียนยุคใหม่! / Welcome to the modern classroom!',
      });

      return updatedSubject;
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

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
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
      const subject = await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      const tracherOnSubject =
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: dto.subjectId,
        });

      if (
        tracherOnSubject !== 'admin-school' &&
        tracherOnSubject.role !== 'ADMIN'
      ) {
        throw new ForbiddenException(
          'Only admin of this school and admin of this subject can delete',
        );
      }
      const remove = await this.subjectRepository.deleteSubject({
        subjectId: dto.subjectId,
      });

      await this.schoolService.schoolRepository.update({
        where: {
          id: subject.schoolId,
        },
        data: {
          totalStorage: {
            decrement: remove.totalDeleteSize,
          },
        },
      });

      const [subjects, school] = await Promise.all([
        this.subjectRepository.findMany({
          where: {
            schoolId: remove.schoolId,
          },
        }),
        this.schoolService.schoolRepository.findUnique({
          where: {
            id: remove.schoolId,
          },
        }),
      ]);

      if (
        subjects.length <= school.limitSubjectNumber &&
        subjects.some((s) => s.isLocked === true)
      ) {
        await this.schoolService.unlockFeatures(school);
      }

      return remove;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllSubjectData(dto: { subjectId: string }) {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      const [
        attendanceTables,
        attendances,
        scoreOnStudents,
        fileOnAssignments,
        studentOnAssignments,
        fileOnStudentAssignments,
        commentOnAssignments,
        skillOnAssignments,
        skillOnStudentAssignments,
        attendanceStatusLists,
        gradeRanges,
        groupOnSubjects,
        unitOnGroups,
        studentOnGroups,
        questionOnVideos,
        studentOnSubjects,
        assignments,
        scoreOnSubjects,
        attendanceRows,
        teacherOnSubjects,
      ] = await Promise.all([
        this.prisma.attendanceTable.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.attendance.findMany({ where: { subjectId: subject.id } }),
        this.prisma.scoreOnStudent.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.fileOnAssignment.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.studentOnAssignment.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.fileOnStudentAssignment.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.commentOnAssignment.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.skillOnAssignment.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.skillOnStudentAssignment.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.attendanceStatusList.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.gradeRange.findMany({ where: { subjectId: subject.id } }),
        this.prisma.groupOnSubject.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.unitOnGroup.findMany({ where: { subjectId: subject.id } }),
        this.prisma.studentOnGroup.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.questionOnVideo.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.studentOnSubject.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.assignment.findMany({
          where: { subjectId: subject.id, status: 'Published' },
          omit: { vector: true, vectorResouce: true },
        }),
        this.prisma.scoreOnSubject.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.attendanceRow.findMany({
          where: { subjectId: subject.id },
        }),
        this.prisma.teacherOnSubject.findMany({
          where: { subjectId: subject.id },
        }),
      ]);

      return {
        subject: {
          description:
            'This data contains the basic information about the subject, such as title, descriptions, and settings. code in subject filed is 6 digits to let student access subject online',
          data: subject,
        },
        attendanceTables: {
          description:
            'This data contains lists of attendance tables associated with the subject. Each table groups attendance sessions.',
          data: attendanceTables,
        },
        attendances: {
          description:
            'This data contains the individual attendance records for students (e.g., present, absent, late).',
          data: attendances,
        },
        scoreOnStudents: {
          description:
            'This data contains behavioral or bonus points/scores awarded directly to individual students in the subject.',
          data: scoreOnStudents,
        },
        fileOnAssignments: {
          description:
            'This data contains files or materials attached to an assignment by the teacher.',
          data: fileOnAssignments,
        },
        studentOnAssignments: {
          description:
            'This data contains the assignments assigned to students, including their submission status and earned scores.',
          data: studentOnAssignments,
        },
        fileOnStudentAssignments: {
          description:
            'This data contains the files or work submitted by students for their assignments.',
          data: fileOnStudentAssignments,
        },
        commentOnAssignments: {
          description:
            'This data contains comments or feedback left by teachers or students on specific student assignments.',
          data: commentOnAssignments,
        },
        skillOnAssignments: {
          description:
            'This data contains the specific skills tied to each assignment for assessment purposes.',
          data: skillOnAssignments,
        },
        skillOnStudentAssignments: {
          description:
            'This data contains the skill weights or evaluations for a student on a specific assignment.',
          data: skillOnStudentAssignments,
        },
        attendanceStatusLists: {
          description:
            'This data contains the custom attendance statuses configured for the subject (e.g., Present, Absent, Sick, Leave).',
          data: attendanceStatusLists,
        },
        gradeRanges: {
          description:
            'This data contains the grade calculation rules or ranges (e.g., 80-100 = A) set for the subject.',
          data: gradeRanges,
        },
        groupOnSubjects: {
          description:
            'This data contains student groups or teams created within the subject.',
          data: groupOnSubjects,
        },
        unitOnGroups: {
          description:
            'This data contains specific units, objectives, or scores tracked within each student group.',
          data: unitOnGroups,
        },
        studentOnGroups: {
          description:
            'This data maps which student belongs to which group within the subject.',
          data: studentOnGroups,
        },
        questionOnVideos: {
          description:
            'This data contains interactive questions embedded in video assignments for the subject.',
          data: questionOnVideos,
        },
        studentOnSubjects: {
          description:
            'This data contains the list of students enrolled in the subject along with their personal data (names, photos, IDs).',
          data: studentOnSubjects,
        },
        assignments: {
          description:
            'This data contains the list of assignments created for the subject, including their titles, max scores, and due dates.',
          data: assignments,
        },
        scoreOnSubjects: {
          description:
            'This data contains the types or categories of behavioral scores (positive/negative) that can be awarded in the subject.',
          data: scoreOnSubjects,
        },
        attendanceRows: {
          description:
            'This data represents specific attendance sessions or dates (columns) created in the attendance tables.',
          data: attendanceRows,
        },
        teacherOnSubjects: {
          description:
            'This data contains the list of teachers managing or teaching the subject.',
          data: teacherOnSubjects,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reportPendingAssignments(subject: Subject): Promise<string> {
    try {
      const studentOnSubjects = await this.prisma.studentOnSubject.findMany({
        where: {
          subjectId: subject.id,
          isActive: true,
        },
        include: {
          studentOnAssignments: {
            where: {
              status: 'PENDDING',
              isAssigned: true,
              assignment: {
                status: 'Published',
              },
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      });

      let message = `📚 รายวิชา: ${subject.title}\nสรุปงานค้างของนักเรียน:\n\n`;

      for (const sos of studentOnSubjects) {
        const pendingCount = sos.studentOnAssignments.length;
        if (pendingCount > 0) {
          const numberStr = sos.number ? `เลขที่ ${sos.number} ` : '';
          message += `${numberStr}${sos.title}${sos.firstName} ${sos.lastName}: ${pendingCount} งาน\n`;
        }
      }
      return message;
    } catch (error) {
      throw error;
    }
  }
}
