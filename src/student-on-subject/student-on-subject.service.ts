import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Assignment,
  GradeRange,
  ScoreOnStudent,
  StudentOnAssignment,
  StudentOnSubject,
  User,
} from '@prisma/client';
import { GradeService } from '../grade/grade.service';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolService } from '../school/school.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { StudentRepository } from '../student/student.repository';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { AttendanceRowRepository } from './../attendance-row/attendance-row.repository';
import { AttendanceRepository } from './../attendance/attendance.repository';
import { ClassRepository } from './../class/class.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { ScoreOnStudentRepository } from './../score-on-student/score-on-student.repository';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { SubjectRepository } from './../subject/subject.repository';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { UserRepository } from './../users/users.repository';
import { WheelOfNameService } from './../wheel-of-name/wheel-of-name.service';
import {
  CreateStudentOnSubjectDto,
  DeleteStudentOnSubjectDto,
  GetStudentOnSubjectByIdDto,
  GetStudentOnSubjectsByStudentIdDto,
  GetStudentOnSubjectsBySubjectIdDto,
} from './dto';
import {
  SortDto,
  UpdateStudentOnSubjectDto,
} from './dto/patch-student-on-subject.dto';
import { StudentOnSubjectReport } from './interfaces';
import {
  StudentOnSubjectRepository,
  StudentOnSubjectRepositoryType,
} from './student-on-subject.repository';

@Injectable()
export class StudentOnSubjectService {
  private logger: Logger = new Logger(StudentOnSubjectService.name);
  studentOnSubjectRepository: StudentOnSubjectRepositoryType;
  private scoreOnStudentRepository: ScoreOnStudentRepository;
  private subjectRepository: SubjectRepository;
  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  private studentRepository: StudentRepository;
  private classRepository: ClassRepository;
  private userRepository: UserRepository;
  private attendanceRepository: AttendanceRepository;
  private attendanceRowRepository: AttendanceRowRepository;
  private assignmentRepository: AssignmentRepository;

  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private wheelOfNameService: WheelOfNameService,
    @Inject(forwardRef(() => SchoolService))
    private schoolService: SchoolService,
    private gradeService: GradeService,
    private skillOnStudentAssignmentService: SkillOnStudentAssignmentService,
  ) {
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.scoreOnStudentRepository = new ScoreOnStudentRepository(this.prisma);
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.subjectRepository = new SubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.classRepository = new ClassRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.userRepository = new UserRepository(this.prisma);
    this.attendanceRepository = new AttendanceRepository(this.prisma);
    this.attendanceRowRepository = new AttendanceRowRepository(this.prisma);
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async getSummaryData(
    dto: { studentOnSubjectId: string },
    user: User,
  ): Promise<StudentOnSubjectReport> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        });

      if (!studentOnSubject) {
        throw new NotFoundException('StudentOnSubject is invaild or not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: studentOnSubject.subjectId,
        userId: user.id,
      });

      const school = await this.schoolService.schoolRepository.findUnique({
        where: {
          id: studentOnSubject.schoolId,
        },
      });

      const subject = await this.subjectRepository.findUnique({
        where: {
          id: studentOnSubject.subjectId,
        },
      });
      const student = await this.studentRepository.findById({
        studentId: studentOnSubject.studentId,
      });
      const classroom = await this.classRepository.findById({
        classId: student.classId,
      });

      const teachers =
        await this.teacherOnSubjectService.teacherOnSubjectRepository.findMany({
          where: {
            subjectId: studentOnSubject.subjectId,
          },
        });

      let homeroom_teacher = {
        firstName: 'No Data',
        lastName: 'No Data',
      };
      if (classroom.userId) {
        homeroom_teacher = await this.userRepository.findById({
          id: classroom.userId,
        });
      }

      const attendances = await this.attendanceRepository.findMany({
        where: {
          studentOnSubjectId: studentOnSubject.id,
        },
      });

      const attendancerows = await this.attendanceRowRepository.findMany({
        where: {
          subjectId: studentOnSubject.subjectId,
        },
      });
      const attendacneGrouped = attendances.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        {},
      );
      const summaryAttendance = Object.entries(attendacneGrouped).map(
        ([status, value]) => ({
          status,
          value,
        }),
      );
      const grade = await this.gradeService.gradeRepository.findUnique({
        where: {
          subjectId: studentOnSubject.subjectId,
        },
      });
      const assignments = await this.assignmentRepository.findMany({
        where: {
          subjectId: studentOnSubject.subjectId,
          status: 'Published',
          type: 'Assignment',
        },
      });

      const academicPerformance = await this.getGradeOnStudent(
        grade,
        assignments,
        studentOnSubject.id,
      );

      const maxScore = assignments.reduce((prev, current) => {
        let score = current.maxScore;

        if (current.weight && current.weight !== null) {
          score = current.weight;
        }
        return prev + score;
      }, 0);

      const skills =
        await this.skillOnStudentAssignmentService.getByStudentOnSubjectId(
          studentOnSubject.id,
        );

      return {
        schoolName: school.title,
        reportTitle: 'Student Report',
        studentInfo: {
          name: `${studentOnSubject.title}${studentOnSubject.firstName} ${studentOnSubject.lastName}`,
          imageURL: studentOnSubject.photo,
          class: classroom.title,
        },
        courseInfo: {
          subject: subject.title,
          description: subject.description,
          educationYear: subject.educationYear,
        },
        teachers: {
          homeroom: `${homeroom_teacher.firstName} ${homeroom_teacher.lastName}`,
          instructor: teachers.map((teacher) => {
            return {
              name: `${teacher.firstName} ${teacher.lastName}`,
              imageURL: teacher.photo,
              email: teacher.email,
            };
          }),
        },
        attendance: {
          status: 'ผ่าน',
          totalHours: attendancerows.length,
          summary: summaryAttendance,
        },
        academicPerformance: {
          overallGrade: academicPerformance.grade,
          overallScore: academicPerformance.totalScore,
          maxScore: maxScore,
          assessments: [
            ...academicPerformance.studentOnAssignments.map((s) => {
              return {
                item: s.assignment.title,
                score: s.pureScore,
                maxScore: s.assignment.weight
                  ? s.assignment.weight.toFixed(2)
                  : s.assignment.maxScore.toFixed(2),
              };
            }),
            ...academicPerformance.scoreOnStudents.map((s) => {
              return {
                item: s.title,
                score: s.totalscore,
                maxScore: '-',
              };
            }),
          ],
        },
        skillAssessment: {
          title: 'สรุปผลทักษะจากรายวิชา',
          skills: skills.map((s) => {
            return {
              skill: s.title,
              percentage: s.average,
            };
          }),
        },
        recommendations: '',
        signatureFields: {
          position: 'Director',
          name: `${homeroom_teacher.firstName} ${homeroom_teacher.lastName}`,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getGradeOnStudent(
    gradeRange: GradeRange,
    assignments: Assignment[],
    studentOnSubjectId: string,
  ): Promise<{
    grade: string;
    totalScore: number;
    scoreOnStudents: {
      scoreOnSubjectId: string;
      title: string;
      totalscore: number;
      value: ScoreOnStudent[];
    }[];
    studentOnAssignments: (StudentOnAssignment & {
      assignment: Assignment;
      pureScore: number;
    })[];
  }> {
    try {
      const studentOnAssignments = await this.studentOnAssignmentRepository
        .findMany({
          where: {
            OR: assignments.map((a) => {
              return {
                studentOnSubjectId: studentOnSubjectId,
                assignmentId: a.id,
              };
            }),
          },
        })
        .then((res) => {
          return res.map((studentOnAssignment) => {
            const assignment = assignments.find(
              (a) => a.id === studentOnAssignment.assignmentId,
            );
            let score = studentOnAssignment.score ?? 0;
            if (assignment.weight !== null) {
              const originalScore = score / assignment.maxScore;
              score = originalScore * assignment.weight;
            }

            return {
              ...studentOnAssignment,
              assignment: assignment,
              pureScore: score,
            };
          });
        });

      const scoreOnStudents = await this.scoreOnStudentRepository.findMany({
        where: {
          studentOnSubjectId: studentOnSubjectId,
        },
      });

      const scoreOnStudentGrouped = scoreOnStudents.reduce<
        Record<string, ScoreOnStudent[]>
      >((acc, item) => {
        const key = item.scoreOnSubjectId;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});

      const scoreOnSubjects = Object.entries(scoreOnStudentGrouped).map(
        ([scoreOnSubjectId, value]) => {
          const totalscore = value.reduce((acc, item) => {
            return (acc += item.score);
          }, 0);
          return {
            scoreOnSubjectId,
            title: `SPEICAL: ${value[0].title}`,
            totalscore: totalscore,
            value,
          };
        },
      );

      const totalScoreAssignment = studentOnAssignments.reduce(
        (prev, current) => {
          let score = current.score;
          if (current.assignment.weight && current.assignment.weight !== null) {
            const originalScore = score / current.assignment.maxScore;
            score = originalScore * current.assignment.weight;
          }

          return prev + score;
        },
        0,
      );
      const totalScore =
        totalScoreAssignment +
        scoreOnSubjects.reduce((acc, item) => {
          return (acc += item.totalscore);
        }, 0);

      const grade = await this.gradeService.assignGrade(totalScore, gradeRange);
      return {
        totalScore,
        grade: grade.grade,
        studentOnAssignments,
        scoreOnStudents: scoreOnSubjects,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentOnSubjectsBySubjectId(
    dto: GetStudentOnSubjectsBySubjectIdDto,
    user: User,
  ): Promise<StudentOnSubject[]> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: {
          subjectId: dto.subjectId,
        },
        orderBy: {
          order: 'asc',
        },
      });

      return studentOnSubjects;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateStudentOnSubjectDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.query.id,
        });
      const subject = await this.subjectRepository.getSubjectById({
        subjectId: studentOnSubject.subjectId,
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      if (!studentOnSubject) {
        throw new NotFoundException('Student on subject does not exist');
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      const update =
        await this.studentOnSubjectRepository.updateStudentOnSubject({
          query: {
            studentOnSubjectId: dto.query.id,
          },
          data: dto.data,
        });

      if (dto.data?.isActive === false) {
        this.studentOnAssignmentRepository.updateMany({
          where: {
            studentOnSubjectId: studentOnSubject.id,
          },
          data: {
            isAssigned: dto.data.isActive,
          },
        });
      }

      if (subject.wheelOfNamePath) {
        const studentActives = await this.studentOnSubjectRepository.findMany({
          where: {
            subjectId: studentOnSubject.subjectId,
            isActive: true,
          },
        });
        this.wheelOfNameService
          .update({
            path: subject.wheelOfNamePath,
            texts: studentActives.map((student) => {
              return {
                text: `${student.title} ${student.firstName} ${student.lastName}`,
              };
            }),
            title: subject.title,
            description: subject.description,
          })
          .catch((error) => {
            this.logger.error(error);
          });
      }

      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentOnSubjectsByStudentId(
    dto: GetStudentOnSubjectsByStudentIdDto,
    user: User,
  ): Promise<StudentOnSubject[]> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectsByStudentId({
          studentId: dto.studentId,
        });

      if (studentOnSubject.length === 0) {
        return [];
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject[0].subjectId,
      });

      return studentOnSubject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentOnSubjectById(
    dto: GetStudentOnSubjectByIdDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        });

      if (!studentOnSubject) {
        throw new NotFoundException('StudentOnSubject not found');
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      return studentOnSubject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createStudentOnSubject(
    dto: CreateStudentOnSubjectDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const student = await this.prisma.student.findUnique({
        where: {
          id: dto.studentId,
        },
      });

      if (!student) {
        throw new NotFoundException('Student does not exist');
      }

      return await this.studentOnSubjectRepository.createStudentOnSubject({
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photo,
        number: student.number,
        studentId: student.id,
        classId: student.classId,
        subjectId: dto.subjectId,
        blurHash: student.blurHash,
        schoolId: student.schoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async sortStudentOnSubjects(dto: SortDto, user: User) {
    try {
      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: {
          id: {
            in: dto.studentOnSubjectIds,
          },
        },
      });
      studentOnSubjects.forEach((studentOnSubject) => {
        if (!studentOnSubject) {
          throw new NotFoundException('Student on subject does not exist');
        }
      });

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubjects[0].subjectId,
      });

      const updates = await Promise.allSettled(
        dto.studentOnSubjectIds.map((id, index) => {
          return this.prisma.studentOnSubject.update({
            where: {
              id,
            },
            data: {
              order: index,
            },
          });
        }),
      );
      const filterSuccess = updates.filter(
        (update) => update.status === 'fulfilled',
      );
      return filterSuccess;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteStudentOnSubject(
    dto: DeleteStudentOnSubjectDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        });

      if (!studentOnSubject) {
        throw new NotFoundException('Student on subject does not exist');
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      return await this.studentOnSubjectRepository.delete({
        studentOnSubjectId: dto.studentOnSubjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
