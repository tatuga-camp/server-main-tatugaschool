import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { PushRepository } from './../web-push/push.repository';
import { PushService } from './../web-push/push.service';
import { EmailService } from './../email/email.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from './class.repository';
import {
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
} from './interfaces/class.interface';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { Class, Student, Subject, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentRepository } from '../student/student.repository';
import { CreateClassDto, DeleteClassDto, UpdateClassDto } from './dto';
import { PushSubscription } from '../web-push/interfaces';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { SubjectRepository } from '../subject/subject.repository';
import { AssignmentRepository } from '../assignment/assignment.repository';

@Injectable()
export class ClassService {
  private logger = new Logger(ClassService.name);
  private studentRepository: StudentRepository;
  private subjectRepository: SubjectRepository;
  private assignmentRepository: AssignmentRepository;
  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  classRepository: ClassRepository;

  constructor(
    private memberOnSchoolService: MemberOnSchoolService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.classRepository = new ClassRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.subjectRepository = new SubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.assignmentRepository = new AssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
  }

  async validateAccess(input: {
    classroom?: Class | undefined;
    classId: string;
  }): Promise<Class> {
    try {
      let classroom = input.classroom;
      if (!classroom) {
        classroom = await this.classRepository.findById({
          classId: input.classId,
        });
      }

      if (classroom.isAchieved === true) {
        throw new ForbiddenException(
          'Class is achieved, It is read-only not allowed to update or make any changes',
        );
      }

      return classroom;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getById(
    dto: { classId: string },
    user: User,
  ): Promise<Class & { students: Student[] }> {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });
      if (!classroom) {
        throw new NotFoundException('Class not found');
      }
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      const students = await this.studentRepository.findByClassId({
        classId: dto.classId,
      });

      return { ...classroom, students };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createClass(createClassDto: CreateClassDto, user: User) {
    try {
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: createClassDto.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException("You're not allowed to create class");
      }

      return await this.classRepository.create(createClassDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getBySchool(
    dto: {
      schoolId: string;
      isAchieved: boolean;
    },
    user: User,
  ): Promise<(Class & { studentNumbers: number })[]> {
    try {
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: dto.schoolId,
      });
      const classes = await this.prisma.class.findMany({
        where: {
          schoolId: dto.schoolId,
          isAchieved: dto.isAchieved,
        },
      });

      const classesWithStudetNumber = await Promise.all(
        classes.map(async (c) => {
          const studentNumbers = await this.studentRepository.count({
            where: {
              classId: c.id,
            },
          });
          return { ...c, studentNumbers };
        }),
      );

      return classesWithStudetNumber;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(dto: { classIds: string[] }, user: User): Promise<Class[]> {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classIds[0],
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException('You are not allowed to reorder class');
      }

      const result = await Promise.allSettled(
        dto.classIds.map(async (classId, index) => {
          return await this.classRepository.update({
            where: { id: classId },
            data: { order: index + 1 },
          });
        }),
      );

      const success = result
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

      return success;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: UpdateClassDto, user: User) {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.query.classId,
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException("You're not allowed to update class");
      }
      return await this.classRepository.update({
        where: { id: dto.query.classId },
        data: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteClassDto, user: User) {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException('You are not allowed to delete class');
      }

      await this.classRepository.delete({ classId: dto.classId });
      this.sendNotificationWhenClassDelete(classroom);
      return classroom;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async sendNotificationWhenClassDelete(classroom: Class) {
    try {
      const memberOnSchools = await this.prisma.memberOnSchool.findMany({
        where: {
          schoolId: classroom.schoolId,
        },
      });

      for (const member of memberOnSchools) {
        const subscriptions = await this.pushService.pushRepository.findMany({
          where: {
            userId: member.userId,
          },
        });
        const emailHTML = `
      <body style="background-color: #f8f9fa;">
    <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
      <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/development-tatuga-school/public/logo.avif" />
      <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
          Class ${classroom.title} has been deleted
        </h1>
        <p style="margin: 0 0 16px;">
        Hello ${member.firstName} ${member.lastName},<br>
        We regret to inform you that the class ${classroom.title} : ${classroom.level} has been deleted by the admin. If you have any questions, please contact the admin.
        All data related to the class has been deleted.
        </p>
         <p style="margin: 0 0 16px; color: #6c757d">
         Do not reply to this email, this email is automatically generated.
         If you have any questions, please contact this email permlap@tatugacamp.com or the address below
        </p>
      </div>
      <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/development-tatuga-school/public/branner.png" />
      <div style="color: #6c757d; text-align: center; margin: 24px 0;">
      Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
      288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีีมา 30000<br>
      โทร 0610277960 Email: permlap@tatugacamp.com<br>
      </div>
    </div>
  </body>
  `;
        await this.emailService.sendMail({
          to: member.email,
          subject: `Class ${classroom.title} has been deleted`,
          html: emailHTML,
        });
        if (subscriptions.length > 0) {
          await Promise.allSettled(
            subscriptions.map((sub) => {
              return this.pushService.sendNotification(
                sub.data as PushSubscription,
                {
                  title: `Class ${classroom.title} has been deleted`,
                  body: `Hello ${member.firstName} ${member.lastName}, We regret to inform you that the class ${classroom.title} has been deleted by the admin. If you have any questions, please contact the admin. All data related to the class has been deleted.`,
                  url: new URL(
                    `${process.env.CLIENT_URL}/school/${classroom.schoolId}?menu=Classes`,
                  ),
                },
              );
            }),
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getGradeSummaryReport(
    dto: { classId: string },
    user: User,
  ): Promise<
    (Subject & {
      students: {
        id: string;
        title: string;
        firstName: string;
        lastName: string;
        assignmentId: string;
        totalScore: number;
      }[];
    })[]
  > {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      const subjects = await this.subjectRepository.findMany({
        where: {
          classId: dto.classId,
        },
      });

      const [studentAssignments, assignments] = await Promise.all([
        this.studentOnAssignmentRepository.findMany({
          where: {
            OR: subjects.map((s) => ({ subjectId: s.id })),
          },
        }),
        this.assignmentRepository.findMany({
          where: {
            OR: subjects.map((s) => ({ subjectId: s.id })),
          },
        }),
      ]);

      const groups = subjects.map((subject) => {
        const students = studentAssignments.reduce<
          Record<
            string,
            {
              id: string;
              title: string;
              firstName: string;
              lastName: string;
              totalScore: number;
              assignmentId: string;
            }
          >
        >((acc, studentAssignment) => {
          const assignment = assignments.find(
            (a) => a.id === studentAssignment.assignmentId,
          );
          let score = studentAssignment.score;

          const originalScore = studentAssignment.score / assignment.maxScore;

          if (assignment.weight !== null) {
            score = originalScore * assignment.weight;
          }
          if (!acc[studentAssignment.studentId]) {
            acc[studentAssignment.studentId] = {
              id: studentAssignment.studentId,
              title: studentAssignment.title,
              firstName: studentAssignment.firstName,
              lastName: studentAssignment.lastName,
              totalScore: score,
              assignmentId: studentAssignment.assignmentId,
            };
          } else {
            acc[studentAssignment.studentId].totalScore += score;
          }

          return acc;
        }, {});

        return { ...subject, students: Object.values(students) };
      });

      return groups;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
