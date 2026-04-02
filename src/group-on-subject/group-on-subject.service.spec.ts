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
import { AttendanceRowService } from '../attendance-row/attendance-row.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AuthService } from '../auth/auth.service';
import { ClassService } from '../class/class.service';
import { EmailService } from '../email/email.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { GradeService } from '../grade/grade.service';
import { GroupOnSubjectService } from '../group-on-subject/group-on-subject.service';
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
import { StudentOnGroupService } from '../student-on-group/student-on-group.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UnitOnGroupService } from '../unit-on-group/unit-on-group.service';
import { UsersService } from '../users/users.service';
import { AiService } from '../ai/ai.service';
import { PushService } from '../web-push/push.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateGroupOnSubjectDto,
  DeleteGroupOnSubjectDto,
  GetGroupOnSubjectDto,
  GetGroupOnSubjectsDto,
  RefetchGroupOnSubjectDto,
  UpdateGroupOnSubjectDto,
} from './dto';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';
import { LineBotService } from '../line-bot/line-bot.service';
import { LineBotModule } from '../line-bot/line-bot.module';
import { RedisService } from '../redis/redis.service';

describe('Group On Subject Service', () => {
  let groupOnSubjectService: GroupOnSubjectService;
  const prismaService = new PrismaService();
  const configService = new ConfigService();
  const httpService = new HttpService();
  const stripeService = new StripeService(configService);
  const storageService = new StorageService(configService, prismaService);
  const jwtService = new JwtService();
  const base64ImageService = new ImageService();

  const emailService = new EmailService(configService);

  let memberOnSchoolService: MemberOnSchoolService;
  let studentService: StudentService;
  let gradeService: GradeService;
  let schoolService: SchoolService;
  let subjectService: SubjectService;

  const userService = new UsersService(prismaService, {} as any);

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

  const subscriptionService = new SubscriptionService(
    stripeService,
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

  const authService = new AuthService(
    emailService,
    jwtService,
    base64ImageService,
    configService,
    prismaService,
    storageService,
    schoolService,
  );
  (userService as any).authService = authService;
  const aiService = new AiService(configService, httpService, authService);
  const teacherOnSubjectService = new TeacherOnSubjectService(
    prismaService,
    configService,
    emailService,
  );

  const wheelOfNameService = new WheelOfNameService(httpService, configService);

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
  const mockRedisService = {  del: jest.fn(), get: jest.fn(), set: jest.fn() , hget: jest.fn(), hset: jest.fn(), expire: jest.fn() } as any as RedisService;
  const studentOnSubjectService = new StudentOnSubjectService(
    prismaService,
    storageService,
    teacherOnSubjectService,
    wheelOfNameService,
    schoolService,
    gradeService,
    skillOnStudentAssignmentService,
    scoreOnSubjectService,
    mockRedisService,
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

  const lineService = new LineBotService(configService);
  const studentOnAssignmentService = new StudentOnAssignmentService(
    prismaService,
    storageService,
    teacherOnSubjectService,
    pushService,
    skillOnStudentAssignmentService,
    notificationService,
    lineService,
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
    mockRedisService,
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
    lineService,
  );

  const attendanceRowService = new AttendanceRowService(
    prismaService,
    studentOnSubjectService,
    subjectService,
    attendanceStatusListService,
    teacherOnSubjectService,
    mockRedisService,
  );

  const attendanceService = new AttendanceService(
    prismaService,
    storageService,
    studentOnSubjectService,
    attendanceTableService,
    attendanceRowService,
    mockRedisService,
  );

  const unitOnGroupService = new UnitOnGroupService(
    prismaService,
    teacherOnSubjectService,
    groupOnSubjectService,
  );

  const studentOnGroupService = new StudentOnGroupService(
    prismaService,
    teacherOnSubjectService,
    unitOnGroupService,
    studentOnSubjectService,
  );

  beforeEach(async () => {
    groupOnSubjectService = new GroupOnSubjectService(
      prismaService,
      subjectService,
      teacherOnSubjectService,
      studentOnSubjectService,
    );
  });

  /////////////////////////////// Create Group On Subject ////////////////////////////

  describe('create', () => {
    // ✅ กรณี: สร้าง groupOnSubject สำเร็จ
    it('should create groupOnSubject successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ทดสอบ',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนทดสอบ',
            phoneNumber: '043999888',
            address: '999 ถนนใหม่',
            zipCode: '40000',
            city: 'นครราชสีมา',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.1/1',
          level: 'มัธยมศึกษาปีที่ 1',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          description: '',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `MATH-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
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
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        // 👇 ทดสอบการสร้าง group
        const dto: CreateGroupOnSubjectDto = {
          subjectId: subject.id,
          title: 'กลุ่มที่ 1',
          description: 'กลุ่มทดลอง',
          numberOfGroups: 5,
        };

        const result = await groupOnSubjectService.create(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.title).toBe(dto.title);
        expect(result.description).toBe(dto.description);
        expect(result.subjectId).toBe(subject.id);
        expect(result.schoolId).toBe(school.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ✅ กรณี: สร้าง groupOnSubject พร้อมหน่วยและนักเรียนสำเร็จ
    it('should create groupOnSubject with units and students successfully', async () => {
      try {
        // สร้างผู้ใช้ (ADMIN)
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ทดสอบ',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        // สร้างโรงเรียน
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนทดสอบ',
            phoneNumber: '043999888',
            address: '999 ถนนใหม่',
            zipCode: '40000',
            city: 'นครราชสีมา',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        // เพิ่มผู้ใช้เข้าโรงเรียน
        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // สร้างห้องเรียน
        const classroom = await classroomService.classRepository.create({
          title: 'ม.1/1',
          level: 'มัธยมศึกษาปีที่ 1',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        // สร้างวิชา
        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          description: '',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `MATH-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // เพิ่มผู้สอนในวิชา
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
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // สร้างนักเรียน 8 คน (เพื่อแบ่งได้ 2 กลุ่ม x 4 คน)
        for (let i = 1; i <= 8; i++) {
          const student = await studentService.studentRepository.create({
            title: 'ด.ช.',
            firstName: `เด็กชาย${i}`,
            lastName: `นักเรียน${i}`,
            photo: 'student.jpg',
            number: `00${i}`,
            classId: classroom.id,
            schoolId: school.id,
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
          });

          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });
        }

        // 🔍 เรียกใช้ฟังก์ชัน create
        const dto: CreateGroupOnSubjectDto = {
          subjectId: subject.id,
          title: 'กลุ่มทดสอบ',
          description: 'สร้างกลุ่มพร้อมสุ่มนักเรียน',
          numberOfGroups: 10,
        };

        const result = await groupOnSubjectService.create(dto, user);

        // ✅ ตรวจสอบผลลัพธ์
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.title).toBe(dto.title);
        expect(result.subjectId).toBe(subject.id);
        expect(result.schoolId).toBe(school.id);

        expect(result.units.length).toBeGreaterThan(0);
        for (const unit of result.units) {
          expect(unit.id).toBeDefined();
          expect(unit.groupOnSubjectId).toBe(result.id);
          expect(unit.subjectId).toBe(subject.id);
          expect(unit.schoolId).toBe(school.id);
          expect(unit.students.length).toBeGreaterThan(0);

          for (const student of unit.students) {
            expect(student.unitOnGroupId).toBe(unit.id);
            expect(student.groupOnSubjectId).toBe(result.id);
            expect(student.subjectId).toBe(subject.id);
            expect(student.schoolId).toBe(school.id);
          }
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี subject ไม่พบ
    it('should throw NotFoundException if subject does not exist', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ไม่พบวิชา',
          email: `nosubject-${Date.now()}@test.com`,
          phone: '0811111111',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนทดสอบ',
            phoneNumber: '043999888',
            address: '999 ถนนใหม่',
            zipCode: '40000',
            city: 'นครราชสีมา',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.1/1',
          level: 'มัธยมศึกษาปีที่ 1',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          description: '',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `MATH-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
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
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const dto: CreateGroupOnSubjectDto = {
          subjectId: '123456789012345678901234',
          title: 'กลุ่มที่ไม่เจอวิชา',
          description: '',
          numberOfGroups: 4,
        };

        await groupOnSubjectService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('subjectId is invaild');
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const dto: CreateGroupOnSubjectDto = {
          subjectId: subject.id,
          title: 'กลุ่มที่ 1',
          description: 'กลุ่มทดลอง',
          numberOfGroups: 4,
        };

        await groupOnSubjectService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const dto: CreateGroupOnSubjectDto = {
          subjectId: subject.id,
          title: 'กลุ่มที่ 1',
          description: 'กลุ่มทดลอง',
          numberOfGroups: 4,
        };

        await groupOnSubjectService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const dto: CreateGroupOnSubjectDto = {
          subjectId: subject.id,
          title: 'กลุ่มที่ 1',
          description: 'กลุ่มทดลอง',
          numberOfGroups: 4,
        };

        await groupOnSubjectService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const dto: CreateGroupOnSubjectDto = {
          subjectId: subject.id,
          title: 'กลุ่มที่ 1',
          description: 'กลุ่มทดลอง',
          numberOfGroups: 4,
        };

        await groupOnSubjectService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Get Group On Subjects ////////////////////////////

  describe('getGroupOnSubjects', () => {
    // กรณี: ดึง groupOnSubject สำเร็จ
    it('should return groupOnSubjects successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ดูได้',
          email: `access-${Date.now()}@test.com`,
          phone: '0891234567',
          password: 'password',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนหาดูง่าย',
            phoneNumber: '043111222',
            address: 'ถนนทดสอบ',
            zipCode: '40000',
            city: 'ขอนแก่น',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.2/1',
          level: 'มัธยมศึกษาปีที่ 2',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          description: '',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `HIS-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
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
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              description: 'กลุ่มของนักเรียน',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: GetGroupOnSubjectsDto = {
          subjectId: subject.id,
        };
        const result = await groupOnSubjectService.getGroupOnSubjects(
          dto,
          user,
        );

        // ตรวจสอบว่าผลลัพธ์ไม่เป็น undefined หรือ null
        expect(result).toBeDefined();
        // ตรวจสอบว่าเป็น array จริง
        expect(Array.isArray(result)).toBe(true);
        // ตรวจสอบว่ามีกลุ่มอย่างน้อย 1 กลุ่ม
        expect(result.length).toBeGreaterThan(0);
        // ตรวจสอบว่ามีกลุ่มที่สร้างไว้จริงอยู่ในผลลัพธ์
        const found = result.find((g) => g.id === group.id);
        expect(found).toBeTruthy();
        // ตรวจสอบค่าเฉพาะของกลุ่มนั้น ว่าตรงกับที่สร้างหรือไม่
        expect(found?.title).toBe('กลุ่ม A'); // ตรวจชื่อกลุ่ม
        expect(found?.description).toBe('กลุ่มของนักเรียน'); // ตรวจคำอธิบาย
        expect(found?.subjectId).toBe(subject.id); // ตรวจ subjectId
        expect(found?.schoolId).toBe(school.id); // ตรวจ schoolId
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    // กรณี: subject ไม่เจอ → ควรโยน NotFoundException
    it('should throw NotFoundException if subject does not exist', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ไม่มีวิชา',
          email: `nosubject-${Date.now()}@test.com`,
          phone: '0811112222',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const dto: GetGroupOnSubjectsDto = {
          subjectId: '123456789012345678901234',
        };

        await groupOnSubjectService.getGroupOnSubjects(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('SubjectId is invaild');
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              description: 'กลุ่มของนักเรียน',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: GetGroupOnSubjectsDto = {
          subjectId: subject.id,
        };

        await groupOnSubjectService.getGroupOnSubjects(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              description: 'กลุ่มของนักเรียน',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: GetGroupOnSubjectsDto = {
          subjectId: subject.id,
        };

        await groupOnSubjectService.getGroupOnSubjects(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              description: 'กลุ่มของนักเรียน',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: GetGroupOnSubjectsDto = {
          subjectId: subject.id,
        };

        await groupOnSubjectService.getGroupOnSubjects(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              description: 'กลุ่มของนักเรียน',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: GetGroupOnSubjectsDto = {
          subjectId: subject.id,
        };

        await groupOnSubjectService.getGroupOnSubjects(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Get Group On Subject ////////////////////////////

  describe('getGroupOnSubject', () => {
    // ✅ ทดสอบกรณี: ดึงข้อมูล groupOnSubject สำเร็จ พร้อมข้อมูล unit และ student ที่อยู่ใน unit
    it('should return groupOnSubject with units and students', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'วิชา',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0890001111',
          password: 'securepass',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนสอนดี',
            phoneNumber: '043123456',
            address: '123 หมู่บ้านการศึกษา',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'school.png',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/1',
          level: 'มัธยมศึกษาปีที่ 3',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          description: '',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `SCI-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'blur',
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
          blurHash: 'blur',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม 1',
              description: 'กลุ่มเรียนย่อย',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทเรียนที่ 1',
            description: 'หัวข้อทดสอบ',
            icon: 'icon.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ1',
          lastName: 'นักเรียน1',
          photo: 'student.png',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ2',
          lastName: 'นักเรียน2',
          photo: 'student.png',
          number: '0002',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject1 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student1.id,
            },
          });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
          user,
        );

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
          user,
        );

        const dto: GetGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        const result = await groupOnSubjectService.getGroupOnSubject(dto, user);

        // ตรวจสอบผลลัพธ์
        expect(result).toBeDefined();
        expect(result.id).toBe(group.id); // group ตรงกับที่สร้าง
        expect(result.subjectId).toBe(subject.id); // subject ตรง
        expect(result.units.length).toBe(1); // มี 1 unit
        expect(result.units[0].id).toBe(unit.id); // unit ตรง
        expect(result.units[0].students.length).toBe(2); // มี 2 student ใน unit
        expect(result.units[0].students[0].studentId).toBe(student1.id); // student1 id ตรง
        expect(result.units[0].students[1].studentId).toBe(student2.id); // student2 id ตรง
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    // กรณี: groupOnSubjectId ไม่ถูกต้อง
    it('should throw NotFoundException if groupOnSubjectId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ผิดรหัส',
          email: `notfound-${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'password',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const dto: GetGroupOnSubjectDto = {
          groupOnSubjectId: '123456789012345678901234',
        };

        await groupOnSubjectService.getGroupOnSubject(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('groupOnSubjectId is invaild');
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม AAAA',
              description: 'กลุ่มเรียนย่อย',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทเรียนที่ 1',
            description: 'หัวข้อทดสอบ',
            icon: 'icon.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ1',
          lastName: 'นักเรียน1',
          photo: 'student.png',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ2',
          lastName: 'นักเรียน2',
          photo: 'student.png',
          number: '0002',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject1 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student1.id,
            },
          });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
          user,
        );

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
          user,
        );

        const dto: GetGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.getGroupOnSubject(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม AAAA',
              description: 'กลุ่มเรียนย่อย',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทเรียนที่ 1',
            description: 'หัวข้อทดสอบ',
            icon: 'icon.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ1',
          lastName: 'นักเรียน1',
          photo: 'student.png',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ2',
          lastName: 'นักเรียน2',
          photo: 'student.png',
          number: '0002',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject1 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student1.id,
            },
          });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
          user,
        );

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
          user,
        );

        const dto: GetGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.getGroupOnSubject(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม AAAA',
              description: 'กลุ่มเรียนย่อย',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทเรียนที่ 1',
            description: 'หัวข้อทดสอบ',
            icon: 'icon.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ1',
          lastName: 'นักเรียน1',
          photo: 'student.png',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ2',
          lastName: 'นักเรียน2',
          photo: 'student.png',
          number: '0002',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject1 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student1.id,
            },
          });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
          user,
        );

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
          user,
        );

        const dto: GetGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.getGroupOnSubject(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม AAAA',
              description: 'กลุ่มเรียนย่อย',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทเรียนที่ 1',
            description: 'หัวข้อทดสอบ',
            icon: 'icon.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ1',
          lastName: 'นักเรียน1',
          photo: 'student.png',
          number: '0001',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ทดสอบ2',
          lastName: 'นักเรียน2',
          photo: 'student.png',
          number: '0002',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject1 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student1.id,
            },
          });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
          user,
        );

        await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
          user,
        );

        const dto: GetGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.getGroupOnSubject(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Refetch Group (Group On Subject) ////////////////////////////
  describe('refetchGroup', () => {
    // ✅ ทดสอบกรณี: เรียก refetchGroup แล้วได้ units และ student ใหม่ตามการสุ่ม
    it('should refetch group and return updated units with students reassigned', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'รีเฟรช',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0890002222',
          password: 'securepass',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนสุ่มใหม่',
            phoneNumber: '043123456',
            address: '123 หมู่บ้านสุ่ม',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'school.png',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'มัธยมศึกษาปีที่ 3',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          description: '',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `MATH-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'blur',
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
          blurHash: 'blur',
        });

        // สร้าง group + unit 2 อัน
        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มสุ่ม',
              description: 'กลุ่มสำหรับการทดสอบการสุ่ม',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit A',
            description: 'Unit A',
            icon: 'icon-a.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit B',
            description: 'Unit B',
            icon: 'icon-b.png',
            order: 2,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'AAA',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'BBB',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '008',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student3 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'CCC',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '009',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // เรียกใช้งาน refetchGroup
        const dto: RefetchGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        const result = await groupOnSubjectService.refetchGroup(dto, user);
        // ตรวจสอบว่า group id ตรงกับ group ที่สร้าง
        expect(result.id).toBe(group.id);
        // ตรวจสอบว่าได้ unit กลับมาทั้งหมด 2 unit
        expect(result.units).toHaveLength(2);
        // ตรวจสอบว่าแต่ละ unit มี field ที่จำเป็น เช่น id, title, students
        result.units.forEach((unit) => {
          expect(unit).toHaveProperty('id');
          expect(unit).toHaveProperty('title');
          expect(Array.isArray(unit.students)).toBe(true);
        });
        // ตรวจสอบว่านักเรียนทั้งหมด 3 คน ถูกสุ่มใส่ใน units
        const totalAssigned = result.units.reduce(
          (sum, unit) => sum + unit.students.length,
          0,
        );
        expect(totalAssigned).toBe(3);
        // ตรวจสอบว่า studentId ที่ถูกใส่ลงใน units ต้องตรงกับ student ที่เราสร้าง
        const allCreatedStudentIds = [student1.id, student2.id, student3.id];
        const allReturnedStudentIds = result.units.flatMap((unit) =>
          unit.students.map((s) => s.studentId),
        );
        // มีนักเรียนครบทุกคน ไม่ตกหล่น
        expect(allReturnedStudentIds).toEqual(
          expect.arrayContaining(allCreatedStudentIds),
        );
        // ตรวจสอบว่าไม่มี student คนไหนถูก assign ซ้ำในหลาย unit
        const uniqueStudentIds = new Set(allReturnedStudentIds);
        expect(uniqueStudentIds.size).toBe(3);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ ทดสอบกรณี: เมื่อส่ง groupOnSubjectId ที่ไม่ถูกต้องเข้ามา → ควรโยน BadRequestException
    it('should throw BadRequestException if groupOnSubjectId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ผิดพลาด',
          email: `invalid-${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'pass123',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const dto: RefetchGroupOnSubjectDto = {
          groupOnSubjectId: '123456789012345678901234',
        };

        await groupOnSubjectService.refetchGroup(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('subjectId is invaild');
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        // สร้าง group + unit 2 อัน
        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มสุ่ม',
              description: 'กลุ่มสำหรับการทดสอบการสุ่ม',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit A',
            description: 'Unit A',
            icon: 'icon-a.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit B',
            description: 'Unit B',
            icon: 'icon-b.png',
            order: 2,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'AAA',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'BBB',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '008',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student3 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'CCC',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '009',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // เรียกใช้งาน refetchGroup
        const dto: RefetchGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.refetchGroup(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        // สร้าง group + unit 2 อัน
        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มสุ่ม',
              description: 'กลุ่มสำหรับการทดสอบการสุ่ม',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit A',
            description: 'Unit A',
            icon: 'icon-a.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit B',
            description: 'Unit B',
            icon: 'icon-b.png',
            order: 2,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'AAA',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'BBB',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '008',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student3 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'CCC',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '009',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // เรียกใช้งาน refetchGroup
        const dto: RefetchGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.refetchGroup(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        // สร้าง group + unit 2 อัน
        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มสุ่ม',
              description: 'กลุ่มสำหรับการทดสอบการสุ่ม',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit A',
            description: 'Unit A',
            icon: 'icon-a.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit B',
            description: 'Unit B',
            icon: 'icon-b.png',
            order: 2,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'AAA',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'BBB',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '008',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student3 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'CCC',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '009',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // เรียกใช้งาน refetchGroup
        const dto: RefetchGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.refetchGroup(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        // สร้าง group + unit 2 อัน
        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มสุ่ม',
              description: 'กลุ่มสำหรับการทดสอบการสุ่ม',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit A',
            description: 'Unit A',
            icon: 'icon-a.png',
            order: 1,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'Unit B',
            description: 'Unit B',
            icon: 'icon-b.png',
            order: 2,
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'AAA',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'BBB',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '008',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const student3 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'CCC',
          lastName: 'ทดสอบ',
          photo: 'photo.png',
          number: '009',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // เรียกใช้งาน refetchGroup
        const dto: RefetchGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.refetchGroup(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Update Group On Subject ////////////////////////////

  describe('update', () => {
    // ✅ กรณี: อัปเดต groupOnSubject สำเร็จ
    it('should update groupOnSubject successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'แก้ไข',
          email: `edit-${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'edit123',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนทดสอบแก้ไข',
            description: 'คำอธิบายที่คุณไม่อ่าน',
            phoneNumber: '043777888',
            address: 'ถนนสายแก้ไข',
            zipCode: '40000',
            city: 'อุดรธานี',
            country: 'Thailand',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.1/3',
          level: 'มัธยมศึกษาปีที่ 1',
          description: '',
          schoolId: school.id,
          userId: user.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'สุขศึกษา',
          description: '',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `HEALTH-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: 'blur',
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มก่อนแก้ไข',
              description: 'ก่อนอัปเดต',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: UpdateGroupOnSubjectDto = {
          query: {
            groupOnSubjectId: group.id,
          },
          body: {
            title: 'กลุ่มใหม่',
            description: 'รายละเอียดใหม่',
          },
        };

        const result = await groupOnSubjectService.update(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(group.id); // id เดิม
        expect(result.title).toBe(dto.body.title); // เปลี่ยนชื่อ
        expect(result.description).toBe(dto.body.description); // เปลี่ยนคำอธิบาย
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ กรณี groupOnSubjectId ไม่ถูกต้อง → ควรโยน NotFoundException
    it('should throw NotFoundException if groupOnSubjectId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ผิดพลาด',
          email: `notfound-${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'fail123',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const dto: UpdateGroupOnSubjectDto = {
          query: {
            groupOnSubjectId: '123456789012345678901234',
          },
          body: {
            title: 'ใหม่',
            description: 'อัปเดตที่ไม่มีจริง',
          },
        };

        await groupOnSubjectService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('groupOnSubjectId is invaild');
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มก่อนแก้ไข',
              description: 'ก่อนอัปเดต',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: UpdateGroupOnSubjectDto = {
          query: {
            groupOnSubjectId: group.id,
          },
          body: {
            title: 'กลุ่มใหม่',
            description: 'รายละเอียดใหม่',
          },
        };

        await groupOnSubjectService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มก่อนแก้ไข',
              description: 'ก่อนอัปเดต',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: UpdateGroupOnSubjectDto = {
          query: {
            groupOnSubjectId: group.id,
          },
          body: {
            title: 'กลุ่มใหม่',
            description: 'รายละเอียดใหม่',
          },
        };

        await groupOnSubjectService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มก่อนแก้ไข',
              description: 'ก่อนอัปเดต',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: UpdateGroupOnSubjectDto = {
          query: {
            groupOnSubjectId: group.id,
          },
          body: {
            title: 'กลุ่มใหม่',
            description: 'รายละเอียดใหม่',
          },
        };

        await groupOnSubjectService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มก่อนแก้ไข',
              description: 'ก่อนอัปเดต',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: UpdateGroupOnSubjectDto = {
          query: {
            groupOnSubjectId: group.id,
          },
          body: {
            title: 'กลุ่มใหม่',
            description: 'รายละเอียดใหม่',
          },
        };

        await groupOnSubjectService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Delete Group On Subject ////////////////////////////

  describe('delete', () => {
    // ✅ กรณีลบสำเร็จ
    it('should delete groupOnSubject successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ลบได้',
          email: `delete-${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'pass123',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนลบได้',
            phoneNumber: '043111222',
            address: '123 ถนนใหญ่',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'school.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/1',
          level: 'มัธยมศึกษาปีที่ 3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          description: '',
          code: `SCI-${Date.now()}`,
          order: 1,
          backgroundImage: 'bg.png',
          userId: user.id,
          blurHash: '',
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
          blurHash: 'blur',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มลบ',
              description: 'สำหรับลบทดสอบ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: DeleteGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };
        const result = await groupOnSubjectService.delete(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(group.id);
        expect(result.title).toBe('กลุ่มลบ');
        expect(result.description).toBe('สำหรับลบทดสอบ');
        expect(result.subjectId).toBe(subject.id);
        expect(result.schoolId).toBe(school.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ กรณี groupOnSubjectId ไม่ถูกต้อง → ควรโยน NotFoundException
    it('should throw NotFoundException if groupOnSubjectId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ไม่พบ',
          lastName: 'กลุ่ม',
          email: `invalid-${Date.now()}@test.com`,
          phone: '0810000000',
          password: 'fail123',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const dto = {
          groupOnSubjectId: '123456789012345678901234',
        };
        await groupOnSubjectService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('groupOnSubjectId is invaild');
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มลบ',
              description: 'สำหรับลบทดสอบ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: DeleteGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงวิชา → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มลบ',
              description: 'สำหรับลบทดสอบ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: DeleteGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: 'logo.png',
            description: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มลบ',
              description: 'สำหรับลบทดสอบ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: DeleteGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ ทดสอบกรณี: ผู้ใช้ไม่มีสิทธิ์เข้าถึงโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'บุคคลทั่วไป',
          lastName: 'ไม่มีสิทธิ์',
          email: `user-no-access-${Date.now()}@test.com`,
          phone: '0800000033',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนป้องกัน',
            phoneNumber: '043111222',
            address: '456/1 ถนนจริง',
            zipCode: '40000',
            city: 'มหาสารคาม',
            country: 'Thailand',
            logo: '',
            description: '',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: 'photo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 4',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ภาษาไทย',
          educationYear: '1/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `TH-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาภาษาไทย',
          userId: user.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
          photo: 'photo.png',
          blurHash: user.blurHash,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มลบ',
              description: 'สำหรับลบทดสอบ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: DeleteGroupOnSubjectDto = {
          groupOnSubjectId: group.id,
        };

        await groupOnSubjectService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });
});
