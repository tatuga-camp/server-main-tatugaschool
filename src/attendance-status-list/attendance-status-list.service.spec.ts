import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Class, MemberRole, Status, User } from '@prisma/client';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { AuthService } from '../auth/auth.service';
import { ClassService } from '../class/class.service';
import { EmailService } from '../email/email.service';
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
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../vector/ai.service';
import { PushService } from '../web-push/push.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { AssignmentService } from '../assignment/assignment.service';
import { StudentOnAssignmentService } from '../student-on-assignment/student-on-assignment.service';
import {
  CreateStatusAttendanceDto,
  UpdateStatusDto,
  DeleteStatusDto,
} from './dto';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import * as crypto from 'crypto';
import { SubscriptionService } from '../subscription/subscription.service';

describe('Attendance-status-list Service', () => {
  let attendanceStatusListService: AttendanceStatusListService;
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
    googleStorageService,
    userService,
    schoolService,
  );

  schoolService = new SchoolService(
    prismaService,
    stripeService,
    memberOnSchoolService,
    googleStorageService,
    subjectService,
    classroomService,
    subscriptionService,
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
    googleStorageService,
    classroomService,
  );

  const skillOnStudentAssignmentService = new SkillOnStudentAssignmentService(
    prismaService,
    memberOnSchoolService,
    googleStorageService,
  );

  const studentOnSubjectService = new StudentOnSubjectService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
    wheelOfNameService,
    schoolService,
    gradeService,
    skillOnStudentAssignmentService,
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

  const assignmentService = new AssignmentService(
    prismaService,
    aiService,
    googleStorageService,
    teacherOnSubjectService,
    subjectService,
    studentOnSubjectService,
    skillService,
    skillOnAssignmentService,
    authService,
    gradeService,
    scoreOnSubjectService,
    scoreOnStudentService,
    studentService,
  );

  const studentOnAssignmentService = new StudentOnAssignmentService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
    pushService,
    skillOnStudentAssignmentService,
  );

  const fileAssignmentService = new FileAssignmentService(
    prismaService,
    googleStorageService,
    subjectService,
    classroomService,
    stripeService,
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
    assignmentService,
    fileAssignmentService,
    attendanceStatusListService,
  );

  beforeEach(async () => {
    attendanceStatusListService = new AttendanceStatusListService(
      prismaService,
      teacherOnSubjectService,
    );
  });

  /////////////////////////////// Create Attendance Status List ////////////////////////////

  describe('create', () => {
    // กรณี: สร้าง status สำเร็จ เมื่อ user มีสิทธิ์เข้าถึง subject
    it('should create status successfully if user is teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Create',
          email: `create-success-1-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Status School',
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
          code: `MATH-${Date.now()}`,
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

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'Test Attendance Table',
              description: 'First week attendance',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: CreateStatusAttendanceDto = {
          title: 'มา',
          value: 1,
          color: '#00FF00',
          attendanceTableId: table.id,
        };

        const result = await attendanceStatusListService.create(dto, user);

        expect(result).toBeDefined();
        expect(result.title).toBe(dto.title);
        expect(result.value).toBe(dto.value);
        expect(result.color).toBe(dto.color);
        expect(result.attendanceTableId).toBe(dto.attendanceTableId);
        expect(result.schoolId).toBe(school.id);
        expect(result.subjectId).toBe(subject.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ attendanceTableId → ควรโยน NotFoundException
    it('should throw NotFoundException if attendanceTable not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'No',
          lastName: 'Table',
          email: `notable-${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: CreateStatusAttendanceDto = {
          title: 'มา',
          value: 1,
          color: '#00FF00',
          attendanceTableId: '123456789012345678901234',
        };

        await attendanceStatusListService.create(dto, user);
        fail('Expected NotFoundException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('attendanceTableId not found');
      }
    });

    // กรณี: มี status ที่ชื่อซ้ำใน attendanceTable เดียวกัน → ควรโยน BadRequestException
    it('should throw BadRequestException if status title already exists in this table', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Duplicate',
          lastName: 'Status',
          email: `duplicate-${Date.now()}@test.com`,
          phone: '0800000002',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Dup School',
            phoneNumber: '0888888888',
            address: 'Dup Rd.',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: '',
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
          title: 'DupClass',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'History',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'History Table',
              description: 'First week attendance',
            },
          );

        await attendanceStatusListService.attendanceStatusListSRepository.create(
          {
            data: {
              title: 'มาแต่ไม่เข้า',
              value: 5,
              color: '#123456',
              attendanceTableId: table.id,
              schoolId: school.id,
              subjectId: subject.id,
            },
          },
        );

        const dto: CreateStatusAttendanceDto = {
          title: 'มาแต่ไม่เข้า',
          value: 6,
          color: '#654321',
          attendanceTableId: table.id,
        };

        await attendanceStatusListService.create(dto, user);
        fail('Expected BadRequestException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Duplicate title');
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง school (ไม่ได้เป็น teacher หรือ admin ในโรงเรียน) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Empty Member On School)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-111${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-111${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const dto: CreateStatusAttendanceDto = {
          title: 'ห้ามเข้า',
          value: 0,
          color: '#000000',
          attendanceTableId: table.id,
        };

        await attendanceStatusListService.create(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง school (ยังไม่ได้เป็น teacher หรือ admin ในโรงเรียน) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Member On School Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-222${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-222${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const dto: CreateStatusAttendanceDto = {
          title: 'ห้ามเข้า',
          value: 0,
          color: '#000000',
          attendanceTableId: table.id,
        };

        await attendanceStatusListService.create(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (ไม่ได้เป็น teacher หรือ admin ในรายวิชา) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Empty Teacher On Subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-333${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-333${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-8888-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const dto: CreateStatusAttendanceDto = {
          title: 'ห้ามเข้า',
          value: 0,
          color: '#000000',
          attendanceTableId: table.id,
        };

        await attendanceStatusListService.create(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (ยังไม่ได้เป็น teacher หรือ admin ในรายวิชา) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Teacher On Subject Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-444${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-444${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-8888-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: outsider.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          email: outsider.email,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const dto: CreateStatusAttendanceDto = {
          title: 'ห้ามเข้า',
          value: 0,
          color: '#000000',
          attendanceTableId: table.id,
        };

        await attendanceStatusListService.create(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Update Attendance Status List ////////////////////////////

  describe('update', () => {
    // กรณี: อัปเดตสำเร็จเมื่อข้อมูลถูกต้อง
    it('should update status successfully with valid data', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Update',
          lastName: 'Success',
          email: `update-success-111${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update School',
            phoneNumber: '0888888888',
            address: 'Update Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'PREMIUM',
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
          title: 'ป.5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'description',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Math Table',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ขาด',
                value: 0,
                color: '#FF0000',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateStatusDto = {
          query: { id: status.id },
          body: {
            title: 'ลา',
            value: 2,
            color: '#FFFF00',
          },
        };

        const result = await attendanceStatusListService.update(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(status.id);
        expect(result.title).toBe(dto.body.title);
        expect(result.value).toBe(dto.body.value);
        expect(result.color).toBe(dto.body.color);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ status → ควร throw NotFoundException
    it('should throw NotFoundException if status not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Update',
          lastName: 'Fail',
          email: `update-fail-status-not-found-111${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: UpdateStatusDto = {
          query: {
            id: '123456789012345678901234',
          },
          body: {
            title: 'ลา',
          },
        };

        await attendanceStatusListService.update(dto, user);
        fail('should throw NotFoundException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Status not found');
      }
    });

    // กรณี: title ซ้ำกับ status อื่น → ควร throw BadRequestException
    it('should throw BadRequestException if title is duplicated', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Update',
          lastName: 'duplicated',
          email: `update-duplicated-1181${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update School',
            phoneNumber: '0888888888',
            address: 'Update Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'PREMIUM',
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
          title: 'ป.5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'duplicated',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math duplicated',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-duplicated-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Math Table duplicated',
              description: 'First week attendance',
            },
          );

        const status1 =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'มา',
                value: 1,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const status2 =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ขาด',
                value: 0,
                color: '#FF0000',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateStatusDto = {
          query: {
            id: status2.id,
          },
          body: {
            title: 'มา',
          },
        };

        await attendanceStatusListService.update(dto, user);
        fail('should throw BadRequestException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Duplicate title');
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง school (ไม่ได้เป็น teacher หรือ admin ในโรงเรียน) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Empty Member On School)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-update-111${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-update-111${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-update-111${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateStatusDto = {
          query: {
            id: status.id,
          },
          body: {
            title: 'ลา',
          },
        };

        await attendanceStatusListService.update(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง school (ยังไม่ได้เป็น teacher หรือ admin ในโรงเรียน) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Member On School Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-update-222${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-update-222${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-update-222${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateStatusDto = {
          query: {
            id: status.id,
          },
          body: {
            title: 'ลา',
          },
        };

        await attendanceStatusListService.update(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (ไม่ได้เป็น teacher หรือ admin ในรายวิชา) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Empty Teacher On Subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-update-333${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-update-333${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-update-333-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateStatusDto = {
          query: {
            id: status.id,
          },
          body: {
            title: 'ลา',
          },
        };

        await attendanceStatusListService.update(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (ยังไม่ได้เป็น teacher หรือ admin ในรายวิชา) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Teacher On Subject Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-update-444${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-update-444${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-update-444-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: outsider.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          email: outsider.email,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateStatusDto = {
          query: {
            id: status.id,
          },
          body: {
            title: 'ลา',
          },
        };

        await attendanceStatusListService.update(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Delete Attendance Status List ////////////////////////////

  describe('delete', () => {
    // กรณี: ลบสำเร็จเมื่อมีสิทธิ์และพบ status
    it('should delete status successfully when user has access and status exists', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Delete',
          lastName: 'Success',
          email: `delete-success-111${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            phoneNumber: '0888888888',
            address: 'Delete Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'PREMIUM',
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
          title: 'ป.5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'description',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-delete-111${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Math Table',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ลบได้',
                value: 9,
                color: '#123456',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteStatusDto = { id: status.id };

        const result = await attendanceStatusListService.delete(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(status.id);
        expect(result.title).toBe('ลบได้');
        expect(result.value).toBe(9);
        expect(result.attendanceTableId).toBe(table.id);
        expect(result.subjectId).toBe(subject.id);
        expect(result.schoolId).toBe(school.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ status → ควร throw NotFoundException
    it('should throw NotFoundException if status is not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Delete',
          lastName: 'Fail',
          email: `delete-fail-1111${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: DeleteStatusDto = {
          id: '123456789012345678901234',
        };

        await attendanceStatusListService.delete(dto, user);
        fail('should throw NotFoundException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Status not found');
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง school (ไม่ได้เป็น teacher หรือ admin ในโรงเรียน) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Empty Member On School)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-delete-111${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-delete-111${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-delete-111${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteStatusDto = { id: status.id };

        await attendanceStatusListService.delete(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง school (ยังไม่ได้เป็น teacher หรือ admin ในโรงเรียน) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the school (Member On School Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-delete-222${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-delete-222${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-delete-222${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteStatusDto = { id: status.id };

        await attendanceStatusListService.delete(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (ไม่ได้เป็น teacher หรือ admin ในรายวิชา) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Empty Teacher On Subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-delete-333${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-delete-333${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-delete-333-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteStatusDto = { id: status.id };

        await attendanceStatusListService.delete(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (ยังไม่ได้เป็น teacher หรือ admin ในรายวิชา) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to the subject (Teacher On Subject Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Owner',
          lastName: 'Teacher',
          email: `owner-delete-444${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const outsider = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'Blocked',
          email: `outsider-delete-444${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            phoneNumber: '0777777777',
            address: 'Secret Rd.',
            zipCode: '99999',
            city: 'Hidden',
            country: 'Thailand',
            description: '',
            logo: '',
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

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: outsider.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: outsider.email,
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ห้องลับ',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ลับสุดยอด',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ลับ',
          educationYear: '1/2026',
          description: 'ลับมาก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SECRET-delete-444-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: outsider.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          firstName: outsider.firstName,
          lastName: outsider.lastName,
          email: outsider.email,
          phone: outsider.phone,
          photo: outsider.photo,
          blurHash: outsider.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              subjectId: subject.id,
              schoolId: school.id,
              title: 'Secret Attendance',
              description: 'First week attendance',
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'สาย',
                value: 3,
                color: '#0000FF',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteStatusDto = { id: status.id };

        await attendanceStatusListService.delete(dto, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });
});
