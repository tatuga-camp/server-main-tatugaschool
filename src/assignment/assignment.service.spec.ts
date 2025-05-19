import { GoogleStorageService } from './../google-storage/google-storage.service';
import { PrismaClient, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AssignmentService } from './assignment.service';
import { AiService } from '../vector/ai.service';
import { HttpService } from '@nestjs/axios';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ImageService } from '../image/image.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SubjectService } from '../subject/subject.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { GradeService } from '../grade/grade.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { PushService } from '../web-push/push.service';
import { SchoolService } from '../school/school.service';
import { StripeService } from '../stripe/stripe.service';
import { StudentService } from '../student/student.service';
import { UsersService } from '../users/users.service';
import { CreateAssignmentDto } from './dto';

describe('Assignment Service', () => {
  let assignmentService: AssignmentService;
  const prismaService = new PrismaService();
  const configService = new ConfigService();
  const httpService = new HttpService();
  const stripeService = new StripeService(configService);
  const googleStorageService = new GoogleStorageService(
    configService,
    prismaService,
  );
  const jwtService = new JwtService();
  const base64ImageService = new ImageService();

  const emailService = new EmailService(configService);
  const authService = new AuthService(
    emailService,
    jwtService,
    base64ImageService,
    configService,
    prismaService,
    googleStorageService,
  );

  const userService = new UsersService(prismaService, authService);
  const aiService = new AiService(configService, httpService, authService);
  const teacherOnSubjectService = new TeacherOnSubjectService(
    prismaService,
    configService,
    emailService,
  );

  const wheelOfNameService = new WheelOfNameService(httpService, configService);
  const attendanceTableService = new AttendanceTableService(
    prismaService,
    teacherOnSubjectService,
    googleStorageService,
  );

  let memberOnSchoolService: MemberOnSchoolService;
  let studentService: StudentService;
  let classroomService: ClassService;
  let gradeService: GradeService;
  let subjectService: SubjectService;
  const schoolService = new SchoolService(
    prismaService,
    stripeService,
    memberOnSchoolService,
    googleStorageService,
    studentService,
    subjectService,
    classroomService,
  );

  const pushService = new PushService(prismaService);
  memberOnSchoolService = new MemberOnSchoolService(
    prismaService,
    emailService,
    pushService,
    schoolService,
  );

  studentService = new StudentService(
    prismaService,
    memberOnSchoolService,
    googleStorageService,
    classroomService,
  );

  classroomService = new ClassService(
    memberOnSchoolService,
    prismaService,
    emailService,
    pushService,
    googleStorageService,
    userService,
    schoolService,
  );
  subjectService = new SubjectService(
    prismaService,
    googleStorageService,
    wheelOfNameService,
    attendanceTableService,
    teacherOnSubjectService,
    classroomService,
    memberOnSchoolService,
    schoolService,
    gradeService,
  );
  const studentOnSubjectService = new StudentOnSubjectService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
    wheelOfNameService,
  );
  const skillService = new SkillService(
    prismaService,
    aiService,
    googleStorageService,
    authService,
  );

  const skillOnAssignmentService = new SkillOnAssignmentService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
  );
  gradeService = new GradeService(
    prismaService,
    subjectService,
    teacherOnSubjectService,
  );
  const scoreOnSubjectService = new ScoreOnSubjectService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
  );
  const scoreOnStudentService = new ScoreOnStudentService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
  );

  beforeEach(async () => {
    assignmentService = new AssignmentService(
      prismaService,
      aiService,
      googleStorageService,
      teacherOnSubjectService,
      subjectService,
      studentOnSubjectService,
      skillService,
      skillOnAssignmentService,
      httpService,
      authService,
      gradeService,
      scoreOnSubjectService,
      scoreOnStudentService,
    );
  });

  const mockUser = {
    id: '66500e4ea1b3f5370ac122f1',
    firstName: 'TEAM',
    email: 'team@gmail.com',
    lastName: 'TEAM',
    photo: 'URL',
    phone: '123',
  } as User;

  describe('createAssignment', () => {
    it('should create ', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: '123',
            description: '123',
            plan: 'FREE',
            country: '123',
            city: '123',
            address: '123',
            zipCode: '123',
            logo: '123',
            blurHash: '123',
            phoneNumber: '123',
            stripe_customer_id: '123',
            stripe_price_id: '123',
            stripe_subscription_id: '123',
          },
        });
        const memberOnSchool =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            photo: mockUser.photo,
            phone: mockUser.phone,
            schoolId: school.id,
            role: 'ADMIN',
            status: 'ACCEPT',
          });

        const classroom = await classroomService.classRepository.create({
          title: '123456',
          description: '123456',
          level: '123',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: '123',
          description: '123',
          classId: classroom.id,
          educationYear: '123',
          userId: mockUser.id,
          schoolId: school.id,
          code: '123456',
        });

        const teacherOnSubject =
          await teacherOnSubjectService.teacherOnSubjectRepository.create({
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            photo: mockUser.photo,
            phone: mockUser.phone,
            status: 'ACCEPT',
            role: 'ADMIN',
            blurHash: '123',
            subjectId: subject.id,
            schoolId: school.id,
          });

        const dto: CreateAssignmentDto = {
          title: '....',
          description: '....',
          dueDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          beginDate: new Date().toISOString(),
          type: 'Assignment',
          maxScore: 20,
        };

        const create = await assignmentService.createAssignment(dto, mockUser);
        expect(create).toBeDefined();
      } catch (error) {
        throw error;
      }
    });
  });
});
