import { SubscriptionService } from './../subscription/subscription.service';
import { HttpService } from '@nestjs/axios';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AssignmentService } from '../assignment/assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { AuthService } from '../auth/auth.service';
import { ClassService } from '../class/class.service';
import { EmailService } from '../email/email.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { GradeService } from '../grade/grade.service';
import { ImageService } from '../image/image.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolService } from '../school/school.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { SkillService } from '../skill/skill.service';
import { StripeService } from '../stripe/stripe.service';
import { StudentOnAssignmentService } from '../student-on-assignment/student-on-assignment.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../vector/ai.service';
import { PushService } from '../web-push/push.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import {
  CreateAttendanceTableDto,
  GetAttendanceTableById,
  GetAttendanceTablesDto,
} from './dto';
import { StorageService } from '../storage/storage.service';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

describe('Attendance-table Service', () => {
  let attendanceTableService: AttendanceTableService;
  const prismaService = new PrismaService();
  const configService = new ConfigService();
  const httpService = new HttpService();
  const stripeService = new StripeService(configService);
  const storageService = new StorageService(configService, prismaService);
  const jwtService = new JwtService();
  const base64ImageService = new ImageService();

  const emailService = new EmailService(configService);
  const authService = new AuthService(
    emailService,
    jwtService,
    base64ImageService,
    configService,
    prismaService,
    storageService,
  );

  const userService = new UsersService(prismaService, authService);
  const aiService = new AiService(configService, httpService, authService);
  const teacherOnSubjectService = new TeacherOnSubjectService(
    prismaService,
    configService,
    emailService,
  );

  const wheelOfNameService = new WheelOfNameService(httpService, configService);

  let memberOnSchoolService: MemberOnSchoolService;
  let studentService: StudentService;
  let gradeService: GradeService;
  let schoolService: SchoolService;
  let subjectService: SubjectService;
  let subscriptionService: SubscriptionService;

  const pushService = new PushService(prismaService);
  const classroomService = new ClassService(
    memberOnSchoolService,
    prismaService,
    emailService,
    pushService,
    storageService,
    userService,
    schoolService,
  );

  schoolService = new SchoolService(
    prismaService,
    stripeService,
    memberOnSchoolService,
    storageService,
    subjectService,
    classroomService,
    subscriptionService,
    userService,
  );

  memberOnSchoolService = new MemberOnSchoolService(
    prismaService,
    emailService,
    pushService,
    schoolService,
  );

  studentService = new StudentService(
    prismaService,
    memberOnSchoolService,
    storageService,
    classroomService,
  );

  const skillOnStudentAssignmentService = new SkillOnStudentAssignmentService(
    prismaService,
    memberOnSchoolService,
    storageService,
  );
  const scoreOnSubjectService = new ScoreOnSubjectService(
    prismaService,
    storageService,
    teacherOnSubjectService,
  );
  const studentOnSubjectService = new StudentOnSubjectService(
    prismaService,
    storageService,
    teacherOnSubjectService,
    wheelOfNameService,
    schoolService,
    gradeService,
    skillOnStudentAssignmentService,
    scoreOnSubjectService,
  );
  const skillService = new SkillService(
    prismaService,
    aiService,
    storageService,
    authService,
  );

  const skillOnAssignmentService = new SkillOnAssignmentService(
    prismaService,
    storageService,
    teacherOnSubjectService,
  );
  gradeService = new GradeService(
    prismaService,
    subjectService,
    teacherOnSubjectService,
  );

  const scoreOnStudentService = new ScoreOnStudentService(
    prismaService,
    storageService,
    teacherOnSubjectService,
  );
  const assignmentVideoQuizRepository = new AssignmentVideoQuizRepository(
    prismaService,
  );

  const assignmentService = new AssignmentService(
    prismaService,
    aiService,
    storageService,
    teacherOnSubjectService,
    subjectService,
    studentOnSubjectService,
    skillService,
    skillOnAssignmentService,
    authService,
    gradeService,
    scoreOnSubjectService,
    scoreOnStudentService,
    assignmentVideoQuizRepository,
    studentService,
    schoolService,
  );

  const notificationRepository = new NotificationRepository(prismaService);
  const notificationService = new NotificationService(
    notificationRepository,
    pushService,
  );

  const studentOnAssignmentService = new StudentOnAssignmentService(
    prismaService,
    storageService,
    teacherOnSubjectService,
    pushService,
    skillOnStudentAssignmentService,
    notificationService,
  );

  const fileAssignmentService = new FileAssignmentService(
    prismaService,
    storageService,
    subjectService,
    classroomService,
    stripeService,
  );

  const attendanceStatusListService = new AttendanceStatusListService(
    prismaService,
    teacherOnSubjectService,
  );

  subjectService = new SubjectService(
    prismaService,
    storageService,
    wheelOfNameService,
    attendanceTableService,
    teacherOnSubjectService,
    classroomService,
    memberOnSchoolService,
    schoolService,
    gradeService,
    assignmentService,
    fileAssignmentService,
    attendanceStatusListService,
  );

  beforeEach(async () => {
    attendanceTableService = new AttendanceTableService(
      prismaService,
      teacherOnSubjectService,
      storageService,
    );
  });

  /////////////////////////////// Create Attendance Table ////////////////////////////

  describe('createAttendanceTable', () => {
    // กรณี: สร้าง attendance table และ statusLists สำเร็จ
    it('should create attendance table and default status lists successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-attendance-table-1-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Attendane Table School',
            phoneNumber: '0999999999',
            address: 'Status Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-attendance-table-1${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const dto: CreateAttendanceTableDto = {
          title: 'Week 1',
          description: 'Intro class',
          subjectId: subject.id,
        };

        const result = await attendanceTableService.createAttendanceTable(
          dto,
          user,
        );

        expect(result).toBeDefined();
        expect(result.title).toBe(dto.title);
        expect(result.description).toBe(dto.description);
        expect(result.subjectId).toBe(subject.id);
        expect(result.statusLists.length).toBe(5);

        const expectedTitles = ['Present', 'Late', 'Sick', 'Absent', 'Holiday'];
        expect(result.statusLists.map((s) => s.title)).toEqual(
          expect.arrayContaining(expectedTitles),
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ subject → ควร throw NotFoundException
    it('should throw NotFoundException if subject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-attendance-table-2-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test12345',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: CreateAttendanceTableDto = {
          title: 'Week 2',
          description: 'Intro class',
          subjectId: '123456789012345678901234',
        };

        await attendanceTableService.createAttendanceTable(dto, user);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject not found');
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน school → ควร throw ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Empty Member On School)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-attendance-table-3-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Attendane Table School',
            phoneNumber: '0999999999',
            address: 'Attendane Table Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-attendance-table-3${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        // ไม่ได้สร้าง teacherOnSubject → ไม่มีสิทธิ์

        const dto: CreateAttendanceTableDto = {
          title: 'Week Forbidden',
          description: 'Should fail access',
          subjectId: subject.id,
        };

        await attendanceTableService.createAttendanceTable(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน school → ควร throw ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Status Pending)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-attendance-table-444-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Attendane Table School',
            phoneNumber: '0999999999',
            address: 'Status Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'PENDDING',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-attendance-table-444${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const dto: CreateAttendanceTableDto = {
          title: 'Week Forbidden',
          description: 'Should fail access',
          subjectId: subject.id,
        };

        await attendanceTableService.createAttendanceTable(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน subject → ควร throw ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Empty Teacher On Subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-attendance-table-5-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Attendane Table School',
            phoneNumber: '0999999999',
            address: 'Status Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-attendance-table-5${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        // ไม่ได้สร้าง teacherOnSubject → ไม่มีสิทธิ์

        const dto: CreateAttendanceTableDto = {
          title: 'Week Forbidden',
          description: 'Should fail access',
          subjectId: subject.id,
        };

        await attendanceTableService.createAttendanceTable(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน subject → ควร throw ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Status Pending)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-attendance-table-666-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Attendane Table School',
            phoneNumber: '0999999999',
            address: 'Status Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-attendance-table-666${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'PENDDING',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const dto: CreateAttendanceTableDto = {
          title: 'Week Forbidden',
          description: 'Should fail access',
          subjectId: subject.id,
        };

        await attendanceTableService.createAttendanceTable(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Get Attendance Tables By Subject ID ////////////////////////////

  describe('getBySubjectId', () => {
    // กรณี: ดึงตารางทั้งหมดในวิชานั้นสำเร็จ (พร้อม statusLists)
    it('should return attendance tables with their status lists successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Get',
          email: `get-attendance-table-by-subject-id-1-${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Get Tables School',
            phoneNumber: '0999999999',
            address: 'Get Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 2',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Science',
          educationYear: '1/2025',
          description: 'วิทยาศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SCI-get-table-by-subject-id-1${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'Week A',
            description: 'Intro science',
            subjectId: subject.id,
          },
          user,
        );

        const dto: GetAttendanceTablesDto = {
          subjectId: subject.id,
        };

        const result = await attendanceTableService.getBySubjectId(dto, user);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        const found = result.find((r) => r.title === 'Week A');
        expect(found).toBeDefined();
        expect(found?.subjectId).toBe(subject.id);
        expect(found?.statusLists).toBeDefined();
        expect(found?.statusLists.length).toBe(5);
        expect(found?.statusLists.map((s) => s.title)).toEqual(
          expect.arrayContaining([
            'Present',
            'Late',
            'Sick',
            'Absent',
            'Holiday',
          ]),
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ subject → ควร throw NotFoundException
    it('should throw NotFoundException if subject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Get',
          email: `get-attendance-table-by-subject-id-2-${Date.now()}@test.com`,
          phone: '0800000002',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: GetAttendanceTablesDto = {
          subjectId: '123456789012345678901234',
        };

        const result = await attendanceTableService.getBySubjectId(dto, user);

        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject not found');
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง → ควร throw ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Get',
          email: `get-attendance-table-by-subject-id-3-${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden School',
            phoneNumber: '0999999999',
            address: 'No Access Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 3',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Geography',
          educationYear: '2/2025',
          description: 'ภูมิศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `GEO-get-table-by-subject-id-3${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        // ไม่มี memberOnSchool / teacherOnSubject

        const dto: GetAttendanceTablesDto = {
          subjectId: subject.id,
        };

        await attendanceTableService.getBySubjectId(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toMatch(
          /member of this school|teacher on this subject/,
        );
      }
    });
  });

  /////////////////////////////// Get Attendance Table By ID ////////////////////////////

  describe('getAttendanceTableById', () => {
    // กรณี: ดึงข้อมูลตารางสำเร็จ พร้อม rows, attendances และ students
    it('should return attendance table with rows, attendances, and students successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Detail',
          email: `get-table-detail-1-${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Table Detail School',
            phoneNumber: '0999999999',
            address: 'Detail Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 4',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ชั้นเรียนป.5',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-get-detail-11${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมชาย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '12',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        await studentOnSubjectService.studentOnSubjectRepository.getStudentOnSubjectsByStudentId(
          {
            studentId: student.id,
          },
        );

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'Detail Table',
            description: 'ตรวจสอบทั้งหมด',
            subjectId: subject.id,
          },
          user,
        );

        const dto: GetAttendanceTableById = {
          attendanceTableId: table.id,
        };

        // ดึงข้อมูลทั้งหมด
        const result = await attendanceTableService.getAttendanceTableById(
          dto,
          user,
        );

        expect(result).toBeDefined();
        expect(result.id).toBe(table.id);
        expect(result.subjectId).toBe(subject.id);
        expect(Array.isArray(result.rows)).toBe(true);
        expect(Array.isArray(result.students)).toBe(true);

        result.rows.forEach((row) => {
          expect(row.attendanceTableId).toBe(table.id);
          expect(Array.isArray(row.attendances)).toBe(true);
        });

        const matchedStudent = result.students.find(
          (s) => s.studentId === student.id,
        );
        expect(matchedStudent).toBeDefined();
        expect(matchedStudent?.subjectId).toBe(subject.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ attendanceTable → ควร throw NotFoundException
    it('should throw NotFoundException if attendance table not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Detail',
          email: `get-table-detail-2-${Date.now()}@test.com`,
          phone: '0800000012',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: GetAttendanceTableById = {
          attendanceTableId: '123456789012345678901234',
        };

        await attendanceTableService.getAttendanceTableById(dto, user);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('attendanceTableId not found');
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง → ควร throw ForbiddenException
    it('should throw ForbiddenException if user has no access to the table', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Detail',
          email: `get-table-detail-3-${Date.now()}@test.com`,
          phone: '0800000013',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access Table',
            phoneNumber: '0999999999',
            address: 'No Access Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 5',
          level: 'ม.2',
          schoolId: school.id,
          userId: user.id,
          description: 'ชั้นเรียน',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'History',
          educationYear: '1/2025',
          description: 'ประวัติศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-get-detail-33${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'REJECT', // <- ไม่มีสิทธิ์
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'Forbidden Table',
            description: 'ควรจะไม่เข้าได้',
            subjectId: subject.id,
          },
          user,
        );

        const dto: GetAttendanceTableById = {
          attendanceTableId: table.id,
        };

        await attendanceTableService.getAttendanceTableById(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toMatch(
          /member of this school|teacher on this subject/,
        );
      }
    });
  });

  /////////////////////////////// Get Attendance Table By SubjectId On Student On Subject ////////////////////////////

  describe('getBySubjectIdOnStudentOnSubject', () => {
    // กรณี: ดึงข้อมูลตารางของนักเรียนในวิชานั้นสำเร็จ
    it('should return attendance tables with rows, attendances, and status lists for a student', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Student',
          lastName: 'One',
          email: `student-attendance-table-1111${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Student Table School',
            phoneNumber: '0999999999',
            address: 'Student Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ม.2',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน ม.2',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-12232${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'มานพ',
          lastName: 'ดีใจ',
          photo: 'https://example.com/photo.jpg',
          number: '12',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.getStudentOnSubjectsByStudentId(
            {
              studentId: student.id,
            },
          );

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'สัปดาห์ที่ 1',
            description: 'เรียนบทที่ 1',
            subjectId: subject.id,
          },
          user,
        );

        const result =
          await attendanceTableService.getBySubjectIdOnStudentOnSubject(
            {
              subjectId: subject.id,
              studentId: student.id,
            },
            student,
          );

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        const found = result.find((r) => r.id === table.id);
        expect(found).toBeDefined();
        expect(found?.subjectId).toBe(subject.id);
        expect(found?.rows).toBeDefined();
        expect(found?.attendances).toBeDefined();
        expect(found?.statusLists).toBeDefined();
        expect(found?.statusLists.map((s) => s.title)).toEqual(
          expect.arrayContaining([
            'Present',
            'Late',
            'Sick',
            'Absent',
            'Holiday',
          ]),
        );
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    // กรณี: student id ไม่ตรงกับที่ login → ควร Forbidden
    it("should throw ForbiddenException if student id doesn't match", async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Student',
          lastName: 'One',
          email: `student-attendance-table-1111243121${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Student Table School',
            phoneNumber: '0999999999',
            address: 'Student Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 1',
          level: 'ม.2',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน ม.2',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'คณิตศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-12232345645${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'มานี',
          lastName: 'มานะ',
          photo: 'https://example.com/photo.jpg',
          number: '14',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        await attendanceTableService.getBySubjectIdOnStudentOnSubject(
          {
            subjectId: crypto.randomUUID(),
            studentId: '123456789012345678901234',
          },
          student,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You don't have access to this student");
      }
    });

    // กรณี: ไม่มีความสัมพันธ์ studentOnSubject → Forbidden
    it('should throw ForbiddenException if student is not found in subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Student',
          lastName: 'NoRelation',
          email: `no-relation-student-234234${Date.now()}@test.com`,
          phone: '0800000013',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'School No Relation',
            phoneNumber: '0999999999',
            address: 'Nowhere Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้อง 5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน 5',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'History',
          educationYear: '2/2025',
          description: 'ประวัติศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-34234523${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กหญิง',
          firstName: 'สมศรี',
          lastName: 'พะยองเดช',
          photo: 'https://example.com/photo.jpg',
          number: '123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // ลบความสัมพันธ์ studentOnSubject หลังจากมันถูกสร้างอัตโนมัติ
        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.getStudentOnSubjectsByStudentId(
            {
              studentId: student.id,
            },
          );

        const found = studentOnSubject.find((r) => r.studentId === student.id);

        if (found) {
          await studentOnSubjectService.studentOnSubjectRepository.delete({
            studentOnSubjectId: found.id,
          });
        }

        await attendanceTableService.getBySubjectIdOnStudentOnSubject(
          {
            subjectId: subject.id,
            studentId: student.id,
          },
          student,
        );
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Student not found');
      }
    });
  });

  //////////////////////////////// Update Attendance Table ////////////////////////////////

  describe('updateAttendanceTable', () => {
    // กรณี: อัปเดตตารางได้สำเร็จ
    it('should update attendance table successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Update',
          email: `teacher-update-${Date.now()}@test.com`,
          phone: '0800000099',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update Table School',
            phoneNumber: '0999999999',
            address: 'Update Road',
            zipCode: '30000',
            city: 'Update City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/1',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนม.3',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ฟิสิกส์',
          educationYear: '2/2025',
          description: 'เรียนฟิสิกส์พื้นฐาน',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `PHY-123${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'สัปดาห์ก่อนแก้',
            description: 'ก่อนอัปเดต',
            subjectId: subject.id,
          },
          user,
        );

        const updated = await attendanceTableService.updateAttendanceTable(
          {
            query: {
              attendanceTableId: table.id,
            },
            body: {
              title: 'ชื่อใหม่สัปดาห์ที่ 2',
              description: 'เรียนบทใหม่ล่าสุด',
            },
          },
          user,
        );

        expect(updated).toBeDefined();
        expect(updated.id).toBe(table.id);
        expect(updated.title).toBe('ชื่อใหม่สัปดาห์ที่ 2');
        expect(updated.description).toBe('เรียนบทใหม่ล่าสุด');
        expect(updated.subjectId).toBe(subject.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ attendance table → ควรโยน NotFoundException
    it('should throw NotFoundException if attendance table not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Ghost',
          lastName: 'User',
          email: `ghost-${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'ghost123',
          photo: 'ghost.png',
          provider: 'LOCAL',
        });

        await attendanceTableService.updateAttendanceTable(
          {
            query: {
              attendanceTableId: '123456789012345678901234',
            },
            body: {
              title: 'Should not work',
            },
          },
          user,
        );

        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Attendance table not found');
      }
    });

    // กรณี: ไม่มีสิทธิเข้าถึงวิชา → ควรโยน ForbiddenException จาก ValidateAccess
    it('should throw ForbiddenException if user is not teacher on this subject (Empty Teacher On Subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unauthorized',
          lastName: 'User',
          email: `unauth-dsfas${Date.now()}@test.com`,
          phone: '0811111122',
          password: 'test1234',
          photo: 'unauth.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            phoneNumber: '0123456789',
            address: 'No Access Rd.',
            zipCode: '11111',
            city: 'NA City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้ามเข้าถึง',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิชาลับ',
          educationYear: '3/2025',
          description: 'ห้ามเปิดเผย',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-fgdhfgh${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'สัปดาห์ลับ',
            description: 'อย่าแตะต้อง',
            subjectId: subject.id,
          },
          user,
        );

        const otherUser = await userService.userRepository.createUser({
          firstName: 'Stranger',
          lastName: 'Guy',
          email: `stranger-wqrewr${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'stranger123',
          photo: 'stranger.png',
          provider: 'LOCAL',
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: otherUser.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: otherUser.email,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          phone: otherUser.phone,
          photo: otherUser.photo,
          blurHash: otherUser.blurHash,
        });

        await attendanceTableService.updateAttendanceTable(
          {
            query: {
              attendanceTableId: table.id,
            },
            body: {
              title: 'แก้ไม่ได้',
            },
          },
          otherUser,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ไม่มีสิทธิเข้าถึงวิชา → ควรโยน ForbiddenException จาก ValidateAccess
    it('should throw ForbiddenException if user is not teacher on this subject (Teacher On Subject Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unauthorized',
          lastName: 'User',
          email: `unauth-1234234${Date.now()}@test.com`,
          phone: '0811111122',
          password: 'test1234',
          photo: 'unauth.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            phoneNumber: '0123456789',
            address: 'No Access Rd.',
            zipCode: '11111',
            city: 'NA City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้ามเข้าถึง',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิชาลับ',
          educationYear: '3/2025',
          description: 'ห้ามเปิดเผย',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-asdasd${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'สัปดาห์ลับ',
            description: 'อย่าแตะต้อง',
            subjectId: subject.id,
          },
          user,
        );

        const otherUser = await userService.userRepository.createUser({
          firstName: 'Stranger',
          lastName: 'Guy',
          email: `stranger-42353425${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'stranger123',
          photo: 'stranger.png',
          provider: 'LOCAL',
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: otherUser.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: otherUser.email,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          phone: otherUser.phone,
          photo: otherUser.photo,
          blurHash: otherUser.blurHash,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: otherUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          email: otherUser.email,
          phone: otherUser.phone,
          photo: otherUser.photo,
          blurHash: otherUser.blurHash,
        });

        await attendanceTableService.updateAttendanceTable(
          {
            query: {
              attendanceTableId: table.id,
            },
            body: {
              title: 'แก้ไม่ได้',
            },
          },
          otherUser,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ไม่มีสิทธิเข้าถึงวิชา → ควรโยน ForbiddenException จาก ValidateAccess
    it('should throw ForbiddenException if user is not member of this school (Empty Member On School)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unauthorized',
          lastName: 'User',
          email: `unauth-dsfasasdasyrtyd${Date.now()}@test.com`,
          phone: '0811111122',
          password: 'test1234',
          photo: 'unauth.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            phoneNumber: '0123456789',
            address: 'No Access Rd.',
            zipCode: '11111',
            city: 'NA City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้ามเข้าถึง',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิชาลับ',
          educationYear: '3/2025',
          description: 'ห้ามเปิดเผย',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-fgdhfgdfdsfh${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'สัปดาห์ลับ',
            description: 'อย่าแตะต้อง',
            subjectId: subject.id,
          },
          user,
        );

        const otherUser = await userService.userRepository.createUser({
          firstName: 'Stranger',
          lastName: 'Guy',
          email: `stranger-wqrewsdfsdr${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'stranger123',
          photo: 'stranger.png',
          provider: 'LOCAL',
        });

        await attendanceTableService.updateAttendanceTable(
          {
            query: {
              attendanceTableId: table.id,
            },
            body: {
              title: 'แก้ไม่ได้',
            },
          },
          otherUser,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิเข้าถึงโรงเรียน→ ควรโยน ForbiddenException จาก ValidateAccess
    it('should throw ForbiddenException if user is not member of this school (Member On School Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unauthorized',
          lastName: 'User',
          email: `unauth-12342gfhfg34${Date.now()}@test.com`,
          phone: '0811111122',
          password: 'test1234',
          photo: 'unauth.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            phoneNumber: '0123456789',
            address: 'No Access Rd.',
            zipCode: '11111',
            city: 'NA City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้ามเข้าถึง',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิชาลับ',
          educationYear: '3/2025',
          description: 'ห้ามเปิดเผย',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-asdasd${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'สัปดาห์ลับ',
            description: 'อย่าแตะต้อง',
            subjectId: subject.id,
          },
          user,
        );

        const otherUser = await userService.userRepository.createUser({
          firstName: 'Stranger',
          lastName: 'Guy',
          email: `stranger-4235342ertret5${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'stranger123',
          photo: 'stranger.png',
          provider: 'LOCAL',
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: otherUser.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          email: otherUser.email,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          phone: otherUser.phone,
          photo: otherUser.photo,
          blurHash: otherUser.blurHash,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: otherUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          email: otherUser.email,
          phone: otherUser.phone,
          photo: otherUser.photo,
          blurHash: otherUser.blurHash,
        });

        await attendanceTableService.updateAttendanceTable(
          {
            query: {
              attendanceTableId: table.id,
            },
            body: {
              title: 'แก้ไม่ได้',
            },
          },
          otherUser,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  //////////////////////////////// Delete Attendance Table ////////////////////////////////

  describe('deleteAttendanceTable', () => {
    // กรณี: ลบ attendance table ได้สำเร็จ
    it('should delete attendance table successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Delete',
          email: `delete-teacher-asde${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete Table School',
            phoneNumber: '0999999999',
            address: 'Delete Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/3',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียน ป.6',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ศิลปะ',
          educationYear: '2/2025',
          description: 'วิชาศิลปะสร้างสรรค์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ART-qweqwe${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'ก่อนลบ',
            description: 'เพื่อทดสอบการลบ',
            subjectId: subject.id,
          },
          user,
        );

        const deleted = await attendanceTableService.deleteAttendanceTable(
          { attendanceTableId: table.id },
          user,
        );

        expect(deleted).toBeDefined();
        expect(deleted.id).toBe(table.id);
        expect(deleted.title).toBe('ก่อนลบ');
        expect(deleted.description).toBe('เพื่อทดสอบการลบ');
        expect(deleted.subjectId).toBe(subject.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ attendance table → ควรโยน NotFoundException
    it('should throw NotFoundException if attendance table not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'NoTable',
          lastName: 'User',
          email: `no-table-dsfdsf${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'test1234',
          photo: 'none.png',
          provider: 'LOCAL',
        });

        await attendanceTableService.deleteAttendanceTable(
          { attendanceTableId: '123456789012345678901234' },
          user,
        );

        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Attendance table not found');
      }
    });

    // กรณี: ผู้ใช้ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-teacher-asdasd${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'test1234',
          photo: 'owner.png',
          provider: 'LOCAL',
        });

        const stranger = await userService.userRepository.createUser({
          firstName: 'Stranger',
          lastName: 'Guy',
          email: `stranger-asdfdsf${Date.now()}@test.com`,
          phone: '0866666666',
          password: 'test1234',
          photo: 'stranger.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0988888888',
            address: 'Secret Rd.',
            zipCode: '50000',
            city: 'SecretCity',
            country: 'Thailand',
            description: '',
            logo: 'private.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ม.2',
          schoolId: school.id,
          userId: user.id,
          description: 'เฉพาะครูเจ้าของ',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิชาลับสุดยอด',
          educationYear: '1/2025',
          description: 'ลับเฉพาะ',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-asfadsf${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table = await attendanceTableService.createAttendanceTable(
          {
            title: 'ลบไม่ได้',
            description: 'เพราะไม่มีสิทธิ์',
            subjectId: subject.id,
          },
          user,
        );

        await attendanceTableService.deleteAttendanceTable(
          { attendanceTableId: table.id },
          stranger,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });
});
