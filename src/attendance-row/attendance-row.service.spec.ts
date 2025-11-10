import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AssignmentService } from '../assignment/assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { AttendanceService } from '../attendance/attendance.service';
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
import { AttendanceRowService } from './attendance-row.service';
import {
  CreateAttendanceRowDto,
  DeleteAttendanceRowDto,
  GetAttendanceRowByIdDto,
  GetAttendanceRowsDto,
  UpdateAttendanceRowDto,
} from './dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { StorageService } from '../storage/storage.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';

describe('Attendance-row Service', () => {
  let attendanceRowService: AttendanceRowService;
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

  const attendanceTableService = new AttendanceTableService(
    prismaService,
    teacherOnSubjectService,
    storageService,
  );

  const attendanceService = new AttendanceService(
    prismaService,
    storageService,
    studentOnSubjectService,
    attendanceTableService,
    attendanceRowService,
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
    attendanceRowService = new AttendanceRowService(
      prismaService,
      studentOnSubjectService,
      subjectService,
      attendanceStatusListService,
      teacherOnSubjectService,
    );
  });

  /////////////////////////////// Create Attendance Row ////////////////////////////

  describe('CreateAttendanceRow', () => {
    // กรณีสร้างสำเร็จ
    it('should create attendance row and return attendances', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Row',
          email: `row-teacher-133432${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'row.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Row School',
            phoneNumber: '0987654321',
            address: 'Row Street',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนดีเด่น',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: 'เลขง่ายๆ',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-asffdsafdf${Date.now()}`,
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
          lastName: 'ทดสอบ',
          photo: 'student.png',
          number: '123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางเช็คชื่อ',
              description: 'เพื่อการเรียนรู้',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: CreateAttendanceRowDto = {
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          note: 'Initial note',
          type: 'SCAN',
          expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          allowScanAt: new Date().toISOString(),
          isAllowScanManyTime: true,
          attendanceTableId: table.id,
        };

        const result = await attendanceRowService.CreateAttendanceRow(
          dto,
          user,
        );

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.attendances).toBeDefined();
        expect(Array.isArray(result.attendances)).toBe(true);
        expect(result.attendances.length).toBeGreaterThan(0); // เพิ่มการเช็คว่ามี attendance อย่างน้อย 1 ตัว

        // วนเช็ค status ของทุก attendance ว่าเป็น 'UNKNOW'
        for (const attendance of result.attendances) {
          expect(attendance.status).toBe('UNKNOW');
        }
        expect(result.attendanceTableId).toBe(table.id);
        expect(result.note).toBe(dto.note);
        expect(result.type).toBe(dto.type);
        expect(result.isAllowScanManyTime).toBe(dto.isAllowScanManyTime);
        expect(result.startDate.toISOString()).toBe(
          dto.startDate.toISOString(),
        );
        expect(result.endDate.toISOString()).toBe(dto.endDate.toISOString());
        expect(result.expireAt.toISOString()).toBe(
          new Date(dto.expireAt).toISOString(),
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ไม่พบ AttendanceTable → NotFoundException
    it('should throw NotFoundException if attendanceTable not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Ghost',
          lastName: 'Teacher',
          email: `ghost-asdasd${Date.now()}@test.com`,
          phone: '0822222222',
          password: 'test1234',
          photo: 'ghost.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Row School',
            phoneNumber: '0987654321',
            address: 'Row Street',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนดีเด่น',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: 'เลขง่ายๆ',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-asdasd${Date.now()}`,
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

        const dto: CreateAttendanceRowDto = {
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          note: 'Initial note 222',
          type: 'SCAN',
          expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          allowScanAt: new Date().toISOString(),
          isAllowScanManyTime: true,
          attendanceTableId: '123456789012345678901234',
        };

        await attendanceRowService.CreateAttendanceRow(dto, user);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('attendanceTableId not found');
      }
    });

    // ขาด field สำหรับ type SCAN → BadRequestException
    it('should throw BadRequestException if type is SCAN but fields are missing', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Row',
          email: `row-teacher-dfg${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'row.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Row School',
            phoneNumber: '0987654321',
            address: 'Row Street',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนดีเด่น',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: 'เลขง่ายๆ',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-ertey${Date.now()}`,
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
              title: 'ตารางเช็คชื่อ',
              description: 'เพื่อการเรียนรู้',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: CreateAttendanceRowDto = {
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          note: 'Initial note 222',
          type: 'SCAN',
          attendanceTableId: table.id,
        };

        await attendanceRowService.CreateAttendanceRow(dto, user);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Attendance Type Scan require allowScanAt, expireAt, isAllowScanManyTime',
        );
      }
    });

    // ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject (Empty teacher on subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Row',
          email: `row-teacher-qqqdsfdsf${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'row.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Row School',
            phoneNumber: '0987654321',
            address: 'Row Street',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนดีเด่น',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: 'เลขง่ายๆ',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-asdatrhus${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางเช็คชื่อ',
              description: 'เพื่อการเรียนรู้',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: CreateAttendanceRowDto = {
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          note: 'Initial note',
          type: 'SCAN',
          expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          allowScanAt: new Date().toISOString(),
          isAllowScanManyTime: true,
          attendanceTableId: table.id,
        };

        await attendanceRowService.CreateAttendanceRow(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
    // ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject (teacherOnSubject status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Row',
          email: `row-teacher-qqqdsfdsfwertewtr${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          photo: 'row.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Row School',
            phoneNumber: '0987654321',
            address: 'Row Street',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนดีเด่น',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: 'เลขง่ายๆ',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-asdatrhussdfsdf${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
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
              title: 'ตารางเช็คชื่อ',
              description: 'เพื่อการเรียนรู้',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: CreateAttendanceRowDto = {
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          note: 'Initial note',
          type: 'SCAN',
          expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          allowScanAt: new Date().toISOString(),
          isAllowScanManyTime: true,
          attendanceTableId: table.id,
        };

        await attendanceRowService.CreateAttendanceRow(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Get Attendance Row ////////////////////////////

  describe('GetAttendanceRows', () => {
    it('should return attendance rows with attendances', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'GetRow',
          email: `teacher-getrow${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'test1234',
          photo: 'teacher.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'GetRow School',
            phoneNumber: '0909090909',
            address: 'Test Address',
            zipCode: '40000',
            city: 'Udon',
            country: 'Thailand',
            description: '',
            logo: 'getrow.png',
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
          title: 'ม.3/1',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนทดสอบ',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '1/2025',
          description: 'วิชานี้เรียนสนุก',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SCI${Date.now()}`,
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
          firstName: 'สมชายยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '3452',
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

        const found = studentOnSubject.find((r) => r.studentId === student.id);

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางทดสอบ',
              description: 'ตารางการเช็คชื่อ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const attendanceId = attendances.find(
          (att) => att.subjectId === subject.id && att.studentId === student.id,
        )?.id;

        const attendance =
          await attendanceService.attendanceRepository.updateAttendanceById({
            query: {
              attendanceId: attendanceId,
            },
            body: {
              status: 'Late',
              note: 'มาสาย 10 นาที',
            },
          });

        const dto: GetAttendanceRowsDto = {
          attendanceTableId: table.id,
        };

        const result = await attendanceRowService.GetAttendanceRows(dto, user);

        // ตรวจสอบว่าผลลัพธ์มีค่าและเป็น array
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // ตรวจสอบว่ามีอย่างน้อย 1 แถวในผลลัพธ์
        expect(result.length).toBeGreaterThan(0);

        // ตรวจสอบว่าแถวที่สร้างไว้มีอยู่ในผลลัพธ์
        const foundRow = result.find((r) => r.id === row.id);
        expect(foundRow).toBeDefined();

        // ตรวจสอบว่าแถวมีข้อมูล attendances และเป็น array
        expect(foundRow.attendances).toBeDefined();
        expect(Array.isArray(foundRow.attendances)).toBe(true);

        // ตรวจสอบว่า attendance ในแถวนั้นมีอย่างน้อย 1 รายการ
        expect(foundRow.attendances.length).toBeGreaterThan(0);

        // ตรวจสอบว่า attendance ที่ได้ตรงกับ attendanceRowId ที่เราสร้างไว้
        const targetAttendance = foundRow.attendances.find(
          (att) => att.attendanceRowId === row.id,
        );
        expect(targetAttendance).toBeDefined();

        // ตรวจสอบว่า status ของ attendance ตรงกับที่เราตั้งไว้ (PRESENT)
        expect(targetAttendance.status).toBe('Late');
        expect(targetAttendance.note).toBe('มาสาย 10 นาที');
      } catch (error) {
        console.log(error);
        throw error;
      }
    });
    // กรณี: มีตารางเช็คชื่อ แต่ยังไม่มีแถวเช็คชื่อใดๆ → ควรคืน array ว่าง
    it('should return empty array if no attendance rows found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Empty',
          email: `teacher-empty${Date.now()}@test.com`,
          phone: '0812345678',
          password: 'test1234',
          photo: 'empty.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Empty School',
            phoneNumber: '0888888888',
            address: 'Empty Address',
            zipCode: '40000',
            city: 'Ubon',
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
          title: 'ม.3/9',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ชีววิทยา',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `BIO${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 2,
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
              title: 'ตารางว่างเปล่า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: GetAttendanceRowsDto = {
          attendanceTableId: table.id,
        };

        const result = await attendanceRowService.GetAttendanceRows(dto, user);

        // ตรวจสอบว่าผลลัพธ์มีค่าและเป็น array
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        // ตรวจสอบว่าผลลัพธ์เป็น array ว่าง
        expect(result.length).toBe(0);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ส่ง attendanceTableId ที่ไม่มีอยู่จริง → ควรโยน NotFoundException
    it('should throw NotFoundException if attendance table not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'NotFound',
          email: `teacher-notfound${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'test1234',
          photo: 'notfound.png',
          provider: 'LOCAL',
        });

        const dto: GetAttendanceRowsDto = {
          attendanceTableId: '123456789012345678901234', // Invalid or non-existing ID
        };

        await attendanceRowService.GetAttendanceRows(dto, user);
        fail('Expected NotFoundException but did not throw');
      } catch (error) {
        // ตรวจสอบว่า error เป็น NotFoundException
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Attendance table not found');
      }
    });

    // ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject (no teacherOnSubject record)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'NoRelation',
          email: `no-rel-${Date.now()}@test.com`,
          phone: '0812340000',
          password: 'test1234',
          photo: 'no.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden School',
            phoneNumber: '0999999999',
            address: 'Forbidden St',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
            description: '',
            logo: 'forbid.png',
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
          title: 'ม.2/2',
          level: 'ม.2',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางเช็คชื่อ',
              description: 'ไม่มีครูสอน',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: GetAttendanceRowsDto = {
          attendanceTableId: table.id,
        };

        await attendanceRowService.GetAttendanceRows(dto, user);
        // fail('Expected ForbiddenException but did not throw');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
    // ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject (teacherOnSubject status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'PendingStatus',
          email: `pending-teacher-${Date.now()}@test.com`,
          phone: '0823456789',
          password: 'test1234',
          photo: 'pending.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Pending School',
            phoneNumber: '0991234567',
            address: 'Pending St',
            zipCode: '40000',
            city: 'Bangkok',
            country: 'Thailand',
            description: '',
            logo: 'pending.png',
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
          title: 'ม.4/5',
          level: 'ม.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'สุขศึกษา',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HEALTH${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
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
              title: 'ตารางสุขศึกษา',
              description: 'รออนุมัติ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const dto: GetAttendanceRowsDto = {
          attendanceTableId: table.id,
        };

        await attendanceRowService.GetAttendanceRows(dto, user);
        // fail('Expected ForbiddenException but did not throw');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Get Attendance Row By ID ////////////////////////////

  describe('GetAttendanceRowById', () => {
    // กรณี: ผู้ใช้เป็นครูในรายวิชาและมีสิทธิ์เข้าถึง → ควรได้ข้อมูลแถวการเข้าเรียนพร้อม attendances กลับมา
    it('should return row with attendances if access granted', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Accept',
          email: `accept-asdfdasf${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Demo School',
            description: 'School',
            phoneNumber: '0999999999',
            address: 'Test Street',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-sadasf${Date.now()}`,
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
          firstName: 'สมชายยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '345223',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางทดสอบ',
              description: 'ตารางการเช็คชื่อ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: GetAttendanceRowByIdDto = {
          attendanceRowId: row.id,
        };

        const result = await attendanceRowService.GetAttendanceRowById(
          dto,
          user,
        );

        expect(result).toBeDefined();
        expect(result.id).toBe(row.id);
        expect(Array.isArray(result.attendances)).toBe(true);
        expect(result.attendances.length).toBeGreaterThan(0);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: attendanceRowId ไม่ถูกต้อง (ไม่มีอยู่จริง) → ควรโยน NotFoundException
    it('should throw NotFoundException if attendanceRowId not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'NoRow',
          lastName: 'Teacher',
          email: `norow-asdf${Date.now()}@test.com`,
          phone: '0800000002',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Demo School',
            description: 'School',
            phoneNumber: '0999999999',
            address: 'Test Street',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-sadas234f${Date.now()}`,
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

        const dto: GetAttendanceRowByIdDto = {
          attendanceRowId: '123456789012345678901234',
        };

        await attendanceRowService.GetAttendanceRowById(dto, user);

        fail('Expected NotFoundException but did not throw');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('attendancerowId is not found');
      }
    });

    // กรณี: ผู้ใช้ไม่ใช่ครูในรายวิชานั้นเลย (ไม่มี teacherOnSubject record) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Out',
          lastName: 'Side',
          email: `out-${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0999999999',
            description: 'NoAccess School',
            address: 'Test Street',
            zipCode: '40000',
            city: 'KK',
            country: 'Thailand',
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
          title: 'ม.1',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-sdfgfdg${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางห้ามเข้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note 555',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: GetAttendanceRowByIdDto = {
          attendanceRowId: row.id,
        };

        await attendanceRowService.GetAttendanceRowById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ผู้ใช้เป็นครูในรายวิชา แต่ teacherOnSubject.status !== ACCEPT → ควรโยน ForbiddenException
    it('should throw ForbiddenException if teacher status !== ACCEPT', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Pending',
          lastName: 'Teacher',
          email: `pending-${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Pending School',
            phoneNumber: '0999999999',
            description: 'school',
            address: 'Pending Road',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
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
          title: 'ป.5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'อังกฤษ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ENG-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
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
              title: 'รออนุมัติ',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note 666',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: GetAttendanceRowByIdDto = {
          attendanceRowId: row.id,
        };

        await attendanceRowService.GetAttendanceRowById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Get Attendance Row ////////////////////////////

  describe('GetAttendanceQrCode', () => {
    // กรณี: ข้อมูลครบ → ควรได้ attendanceRow, students พร้อม attendance, subject และ status
    it('should return attendanceRow, students with attendance, subject, and status if all data exist', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'QR',
          email: `qr23432${Date.now()}@test.com`,
          phone: '0800000001',
          password: '123456',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'QR School',
            description: '',
            phoneNumber: '0999999999',
            address: 'Test Ave',
            zipCode: '40000',
            city: 'KKU',
            country: 'Thailand',
            logo: 'logo.png',
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
          title: 'ป.5/1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SCI-qwe${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมชายยยยยยย',
          lastName: 'ใจดีมากมาย',
          photo: 'https://example.com/photo.jpg',
          number: '34',
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

        const found = studentOnSubject.find((r) => r.studentId === student.id);

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'QR Table',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'QR note',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'Present',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const attendanceId = attendances.find(
          (att) => att.subjectId === subject.id && att.studentId === student.id,
        )?.id;

        const attendance =
          await attendanceService.attendanceRepository.updateAttendanceById({
            query: {
              attendanceId: attendanceId,
            },
            body: {
              status: 'Present',
              note: 'มาทันเวลาพอดีอย่างกับรู้ใจ',
            },
          });

        const result = await attendanceRowService.GetAttendanceQrCode({
          attendanceRowId: row.id,
        });

        // ตรวจสอบว่า attendanceRow ถูกต้อง
        expect(result.attendanceRow).toBeDefined();
        expect(result.attendanceRow.id).toBe(row.id);

        // ตรวจสอบว่า subject ถูกต้อง
        expect(result.subject).toBeDefined();
        expect(result.subject.id).toBe(subject.id);

        // ตรวจสอบว่า status มี title ตรงกับ 'PRESENT'
        const matchedStatus = result.status.find((s) => s.title === 'Present');
        expect(matchedStatus).toBeDefined();
        expect(matchedStatus?.title).toBe('Present');

        // ตรวจสอบว่านักเรียนมีอยู่ใน students พร้อม attendance ที่ตรงกับ subject
        const matchedStudent = result.students.find(
          (s) => s.studentId === student.id,
        );
        expect(matchedStudent).toBeDefined();
        expect(matchedStudent?.attendance).toBeDefined();
        expect(matchedStudent?.attendance?.id).toBe(attendance.id);
        expect(matchedStudent?.attendance?.status).toBe('Present');
        expect(matchedStudent?.attendance?.note).toBe(
          'มาทันเวลาพอดีอย่างกับรู้ใจ',
        );
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ attendanceRow → ควรโยน NotFoundException
    it('should throw NotFoundException if attendanceRow not found', async () => {
      try {
        await attendanceRowService.GetAttendanceQrCode({
          attendanceRowId: '123456789012345678901234',
        });
        fail('Expected NotFoundException but did not throw');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('attendancerowId is not found');
      }
    });
  });

  /////////////////////////////// Update Attendance Row ////////////////////////////

  describe('UpdateAttendanceRow', () => {
    // กรณี: อัปเดต note และ isAllowScanManyTime สำเร็จ
    it('should update note and isAllowScanManyTime if user is teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Edit',
          email: `edit-asdasd1234${Date.now()}@test.com`,
          phone: '0800000999',
          password: '123456',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Edit School',
            description: '',
            phoneNumber: '0999999999',
            address: 'Edit Ave',
            zipCode: '40000',
            city: 'KKU',
            country: 'Thailand',
            logo: 'logo.png',
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
          title: 'ป.5/2',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-adsf${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
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
              title: 'Math Table',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                note: 'original note',
                type: 'SCAN',
                expireAt: new Date(
                  Date.now() + 2 * 60 * 60 * 1000,
                ).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: false,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateAttendanceRowDto = {
          query: { attendanceRowId: row.id },
          body: {
            note: 'อัปเดตหมายเหตุ',
            isAllowScanManyTime: true,
          },
        };

        const updated = await attendanceRowService.UpdateAttendanceRow(
          dto,
          user,
        );

        // ตรวจสอบผลลัพธ์
        expect(updated.id).toBe(row.id);
        expect(updated.note).toBe('อัปเดตหมายเหตุ');
        expect(updated.isAllowScanManyTime).toBe(true);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    // กรณี: ผู้ใช้ไม่ใช่ครูในรายวิชานั้นเลย (ไม่มี teacherOnSubject record) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Out',
          lastName: 'Side',
          email: `out-${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0999999999',
            description: 'NoAccess School',
            address: 'Test Street',
            zipCode: '40000',
            city: 'KK',
            country: 'Thailand',
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
          title: 'ม.1',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-sdfgfdg435${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางห้ามเข้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note 555',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateAttendanceRowDto = {
          query: { attendanceRowId: row.id },
          body: {
            note: 'อัปเดตหมายเหตุ',
            isAllowScanManyTime: true,
          },
        };

        const updated = await attendanceRowService.UpdateAttendanceRow(
          dto,
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ผู้ใช้เป็นครูในรายวิชา แต่ teacherOnSubject.status !== ACCEPT → ควรโยน ForbiddenException
    it('should throw ForbiddenException if teacher status !== ACCEPT', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Pending',
          lastName: 'Teacher',
          email: `pending-${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Pending School',
            phoneNumber: '0999999999',
            description: 'school',
            address: 'Pending Road',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
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
          title: 'ป.5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'อังกฤษ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ENG-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
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
              title: 'รออนุมัติ',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note 777',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateAttendanceRowDto = {
          query: { attendanceRowId: row.id },
          body: {
            note: 'อัปเดตหมายเหตุ',
            isAllowScanManyTime: true,
          },
        };

        const updated = await attendanceRowService.UpdateAttendanceRow(
          dto,
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });

  /////////////////////////////// Delete Attendance Row ////////////////////////////

  describe('DeleteAttendanceRow', () => {
    // กรณี: ผู้ใช้เป็น ADMIN หรืออาจารย์ที่ได้รับสิทธิ์ → ลบ attendance row สำเร็จ
    it('should delete attendance row if user has access to subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Delete',
          email: `delete-teacher-1234234${Date.now()}@test.com`,
          phone: '0800000999',
          password: '123456',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            description: '',
            phoneNumber: '0999999999',
            address: 'Delete Ave',
            zipCode: '40000',
            city: 'KKU',
            country: 'Thailand',
            logo: 'logo.png',
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
          title: 'ป.5/3',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-3235${Date.now()}`,
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
              title: 'History Table',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                note: 'note to be deleted',
                type: 'SCAN',
                expireAt: new Date(
                  Date.now() + 2 * 60 * 60 * 1000,
                ).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: false,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteAttendanceRowDto = {
          attendanceRowId: row.id,
        };

        const result = await attendanceRowService.DeleteAttendanceRow(
          dto,
          user,
        );

        expect(result).toBeDefined();
        expect(result.id).toBe(row.id);
        expect(result.subjectId).toBe(subject.id);
        expect(result.attendanceTableId).toBe(table.id);
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    // กรณี: ผู้ใช้ไม่ใช่ครูในรายวิชานั้นเลย (ไม่มี teacherOnSubject record) → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user not teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Out',
          lastName: 'Side',
          email: `out-345423${Date.now()}@test.com`,
          phone: '0800000003',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0999999999',
            description: 'NoAccess School',
            address: 'Test Street',
            zipCode: '40000',
            city: 'KK',
            country: 'Thailand',
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
          title: 'ม.1',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-676789${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางห้ามเข้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note 555',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteAttendanceRowDto = {
          attendanceRowId: row.id,
        };

        const result = await attendanceRowService.DeleteAttendanceRow(
          dto,
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // กรณี: ผู้ใช้เป็นครูในรายวิชา แต่ teacherOnSubject.status !== ACCEPT → ควรโยน ForbiddenException
    it('should throw ForbiddenException if teacher status !== ACCEPT', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Pending',
          lastName: 'Teacher',
          email: `pending-235435${Date.now()}@test.com`,
          phone: '0800000004',
          password: 'pass1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Pending School',
            phoneNumber: '0999999999',
            description: 'school',
            address: 'Pending Road',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
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
          title: 'ป.5',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'อังกฤษ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ENG-235435${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
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
              title: 'รออนุมัติ',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
                note: 'Initial note 777',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: DeleteAttendanceRowDto = {
          attendanceRowId: row.id,
        };

        const result = await attendanceRowService.DeleteAttendanceRow(
          dto,
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });
  });
});
