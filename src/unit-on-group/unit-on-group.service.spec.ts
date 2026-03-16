import { HttpService } from '@nestjs/axios';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
import { AiService } from '../vector/ai.service';
import { PushService } from '../web-push/push.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateUnitOnGroupDto,
  DeleteUnitOnGroupDto,
  ReorderUnitOnGroupDto,
  UpdateUnitOnGroupDto,
} from './dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

describe('Unit On Group Service', () => {
  let unitOnGroupService: UnitOnGroupService;
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

  const attendanceTableService = new AttendanceTableService(
    prismaService,
    teacherOnSubjectService,
    storageService,
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

  const attendanceRowService = new AttendanceRowService(
    prismaService,
    studentOnSubjectService,
    subjectService,
    attendanceStatusListService,
    teacherOnSubjectService,
  );

  const attendanceService = new AttendanceService(
    prismaService,
    storageService,
    studentOnSubjectService,
    attendanceTableService,
    attendanceRowService,
  );

  const groupOnSubjectService = new GroupOnSubjectService(
    prismaService,
    subjectService,
    teacherOnSubjectService,
    studentOnSubjectService,
  );

  const studentOnGroupService = new StudentOnGroupService(
    prismaService,
    teacherOnSubjectService,
    unitOnGroupService,
    studentOnSubjectService,
  );

  beforeEach(async () => {
    unitOnGroupService = new UnitOnGroupService(
      prismaService,
      teacherOnSubjectService,
      groupOnSubjectService,
    );
  });

  /////////////////////////////// Create Unit On Group ////////////////////////////

  describe('create', () => {
    // ✅ ทดสอบกรณี: สร้าง unitOnGroup สำเร็จ
    it('should create unitOnGroup successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'สมชาย',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนบ้านทดสอบ',
            phoneNumber: '043222333',
            address: '123 ทดสอบ',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'photo.png',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `SCI-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: '',
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
          photo: 'photo.png',
          blurHash: '',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: CreateUnitOnGroupDto = {
          groupOnSubjectId: group.id,
          title: 'บทที่ 1',
          description: 'บทแรก',
          icon: '🧪',
          order: 1,
        };

        const result = await unitOnGroupService.create(dto, user);

        expect(result.title).toBe('บทที่ 1');
        expect(result.groupOnSubjectId).toBe(group.id);
        expect(result.schoolId).toBe(school.id);
        expect(result.subjectId).toBe(subject.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    it('should throw NotFoundException if groupOnSubjectId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ครู',
          lastName: 'ผิดพลาด',
          email: `teacher-invalid-group-${Date.now()}@test.com`,
          phone: '0800000022',
          password: 'test1234',
          provider: 'LOCAL',
          photo: 'photo.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนบ้านทดสอบ',
            phoneNumber: '043222333',
            address: '123 ทดสอบ',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'photo.png',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ประถมศึกษาปีที่ 6',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `SCI-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: 'วิชาวิทยาศาสตร์',
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

        const dto: CreateUnitOnGroupDto = {
          groupOnSubjectId: '123456789012345678901234', // invalid MongoId
          title: 'บทที่ผิดพลาด',
          description: 'บทที่ไม่มี',
          icon: 'icon.png',
          order: 1,
        };

        await unitOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('goupOnSubjectId is invaild');
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: CreateUnitOnGroupDto = {
          groupOnSubjectId: group.id,
          title: 'บทลับ',
          description: 'ลับสุดยอด',
          icon: '🔒',
          order: 1,
        };

        await unitOnGroupService.create(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: CreateUnitOnGroupDto = {
          groupOnSubjectId: group.id,
          title: 'บทลับ',
          description: 'ลับสุดยอด',
          icon: '🔒',
          order: 1,
        };

        await unitOnGroupService.create(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: CreateUnitOnGroupDto = {
          groupOnSubjectId: group.id,
          title: 'บทลับ',
          description: 'ลับสุดยอด',
          icon: '🔒',
          order: 1,
        };

        await unitOnGroupService.create(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const dto: CreateUnitOnGroupDto = {
          groupOnSubjectId: group.id,
          title: 'บทลับ',
          description: 'ลับสุดยอด',
          icon: '🔒',
          order: 1,
        };

        await unitOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Update Unit On Group ////////////////////////////

  describe('update', () => {
    // ✅ ทดสอบกรณี: อัปเดต unitOnGroup สำเร็จ (มีการเพิ่ม score)
    it('should update unitOnGroup and increment totalScore if score is provided', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Update',
          email: `update-success-${Date.now()}@test.com`,
          phone: '0800000099',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Bangkok',
            zipCode: '10000',
            city: 'BKK',
            country: 'Thailand',
            description: '',
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
          blurHash: 'LKF8s$%N00Rj_3t7ogWB_NIoxtM{',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/3',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ชั้นเรียนทดสอบ',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ประวัติศาสตร์',
          educationYear: '1/2025',
          description: 'เนื้อหาประวัติศาสตร์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `HIS-${Date.now()}`,
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
          blurHash: 'LKF8s$%N00Rj_3t7ogWB_NIoxtM{',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มศึกษา',
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

        const dto: UpdateUnitOnGroupDto = {
          query: {
            unitOnGroupId: unit.id,
          },
          body: {
            title: 'บทเรียนที่ 1 - ปรับปรุง',
            description: 'หัวข้อปรับปรุง',
            icon: 'icon-updated.png',
            score: 5,
          },
        };

        const updated = await unitOnGroupService.update(dto, user);

        expect(updated.title).toBe('บทเรียนที่ 1 - ปรับปรุง');
        expect(updated.description).toBe('หัวข้อปรับปรุง');
        expect(updated.icon).toBe('icon-updated.png');
        expect(updated.totalScore).toBe(unit.totalScore + 5);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ ทดสอบกรณี: unitOnGroupId ไม่ถูกต้อง → ควรโยน NotFoundException
    it('should throw NotFoundException if unitOnGroup not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Invalid',
          email: `update-notfound-${Date.now()}@test.com`,
          phone: '0800000015',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: UpdateUnitOnGroupDto = {
          query: {
            unitOnGroupId: '123456789012345678901234',
          },
          body: {
            title: 'x',
            score: 5,
          },
        };

        await unitOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('goupOnSubjectId is invaild');
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
              title: 'กลุ่มลับ',
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

        const dto: UpdateUnitOnGroupDto = {
          query: {
            unitOnGroupId: unit.id,
          },
          body: {
            title: 'บทเรียนที่ 1 - ปรับปรุง',
            description: 'หัวข้อปรับปรุง',
            icon: 'icon-updated.png',
            score: 5,
          },
        };

        const updated = await unitOnGroupService.update(dto, user);
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
              title: 'กลุ่มลับ',
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

        const dto: UpdateUnitOnGroupDto = {
          query: {
            unitOnGroupId: unit.id,
          },
          body: {
            title: 'บทเรียนที่ 1 - ปรับปรุง',
            description: 'หัวข้อปรับปรุง',
            icon: 'icon-updated.png',
            score: 5,
          },
        };

        const updated = await unitOnGroupService.update(dto, user);
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
              title: 'กลุ่มลับ',
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

        const dto: UpdateUnitOnGroupDto = {
          query: {
            unitOnGroupId: unit.id,
          },
          body: {
            title: 'บทเรียนที่ 1 - ปรับปรุง',
            description: 'หัวข้อปรับปรุง',
            icon: 'icon-updated.png',
            score: 5,
          },
        };

        const updated = await unitOnGroupService.update(dto, user);
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
              title: 'กลุ่มลับ',
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

        const dto: UpdateUnitOnGroupDto = {
          query: {
            unitOnGroupId: unit.id,
          },
          body: {
            title: 'บทเรียนที่ 1 - ปรับปรุง',
            description: 'หัวข้อปรับปรุง',
            icon: 'icon-updated.png',
            score: 5,
          },
        };

        const updated = await unitOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  describe('reorder', () => {
    // ✅ ทดสอบกรณี: จัดเรียงใหม่สำเร็จ
    it('should reorder unitOnGroup successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Test',
          lastName: 'User',
          email: 'unitreorder@test.com',
          phone: '0800000011',
          password: 'test1234',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนบ้านทดสอบ',
            phoneNumber: '043222333',
            address: '123 ทดสอบ',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'photo.png',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `SCI-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: '',
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
          photo: 'photo.png',
          blurHash: '',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              schoolId: school.id,
              subjectId: subject.id,
              title: 'Group1',
              description: '',
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit1',
            icon: 'icon.png',
            order: 0,
            description: 'หัวข้อทดสอบ',
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit2',
            order: 1,
            totalScore: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: ReorderUnitOnGroupDto = {
          unitOnGroupIds: [unit2.id, unit1.id],
        };
        const result = await unitOnGroupService.reorder(dto, user);

        expect(result.length).toBe(2);
        const reorderedUnit1 = result.find((u) => u.id === unit1.id);
        const reorderedUnit2 = result.find((u) => u.id === unit2.id);
        expect(reorderedUnit1?.order).toBe(1);
        expect(reorderedUnit2?.order).toBe(0);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ ทดสอบกรณี: ไม่พบ unitOnGroupId → ควร throw NotFoundException
    it('should throw NotFoundException if first unitOnGroupId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Test',
          lastName: 'User',
          email: 'unitinvalid@test.com',
          phone: '0800000012',
          password: 'test1234',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียนบ้านทดสอบ',
            phoneNumber: '043222333',
            address: '123 ทดสอบ',
            zipCode: '40000',
            city: 'ขอนแก่น',
            country: 'Thailand',
            logo: 'photo.png',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทยาศาสตร์',
          educationYear: '2/2025',
          classId: classroom.id,
          schoolId: school.id,
          code: `SCI-${Date.now()}`,
          order: 1,
          backgroundImage: 'photo.png',
          description: '',
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
          photo: 'photo.png',
          blurHash: '',
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              schoolId: school.id,
              subjectId: subject.id,
              title: 'Group1',
              description: '',
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit1',
            icon: 'icon.png',
            order: 0,
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: ReorderUnitOnGroupDto = {
          unitOnGroupIds: ['123456789012345678901234', unit1.id],
        };
        const result = await unitOnGroupService.reorder(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('One of the unitOnGroupId is invaild');
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit1',
            icon: 'icon.png',
            order: 0,
            description: 'หัวข้อทดสอบ',
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit2',
            order: 1,
            totalScore: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: ReorderUnitOnGroupDto = {
          unitOnGroupIds: [unit2.id, unit1.id],
        };

        const result = await unitOnGroupService.reorder(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit1',
            icon: 'icon.png',
            order: 0,
            description: 'หัวข้อทดสอบ',
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit2',
            order: 1,
            totalScore: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: ReorderUnitOnGroupDto = {
          unitOnGroupIds: [unit2.id, unit1.id],
        };

        const result = await unitOnGroupService.reorder(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit1',
            icon: 'icon.png',
            order: 0,
            description: 'หัวข้อทดสอบ',
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit2',
            order: 1,
            totalScore: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: ReorderUnitOnGroupDto = {
          unitOnGroupIds: [unit2.id, unit1.id],
        };

        const result = await unitOnGroupService.reorder(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit1 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit1',
            icon: 'icon.png',
            order: 0,
            description: 'หัวข้อทดสอบ',
          },
        });

        const unit2 = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit2',
            order: 1,
            totalScore: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: ReorderUnitOnGroupDto = {
          unitOnGroupIds: [unit2.id, unit1.id],
        };

        const result = await unitOnGroupService.reorder(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Delete Unit On Group ////////////////////////////

  describe('delete', () => {
    // ✅ ลบ unitOnGroup สำเร็จ
    it('should delete unitOnGroup successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Delete',
          lastName: 'Unit',
          email: 'deleteunit@test.com',
          phone: '0800000111',
          password: 'test1234',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            description: 'desc',
            phoneNumber: '0999999999',
            address: 'Delete Road',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Loei',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
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
              schoolId: school.id,
              subjectId: subject.id,
              title: 'Group X',
              description: '',
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit Delete',
            order: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: DeleteUnitOnGroupDto = {
          unitOnGroupId: unit.id,
        };

        const deleted = await unitOnGroupService.delete(dto, user);

        expect(deleted.id).toBe(unit.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ ไม่พบ unitOnGroupId
    it('should throw NotFoundException if unitOnGroupId is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Invalid',
          lastName: 'Id',
          email: 'invalidunit@test.com',
          phone: '0800000112',
          password: 'test1234',
          photo: 'a.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            description: 'desc',
            phoneNumber: '0999999999',
            address: 'Delete Road',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Loei',
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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          photo: user.photo,
          blurHash: user.blurHash,
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
              schoolId: school.id,
              subjectId: subject.id,
              title: 'Group X',
              description: '',
            },
          });

        const dto: DeleteUnitOnGroupDto = {
          unitOnGroupId: '123456789012345678901234',
        };

        const deleted = await unitOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('One of the unitOnGroupId is invaild');
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit Delete',
            order: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: DeleteUnitOnGroupDto = {
          unitOnGroupId: unit.id,
        };

        const deleted = await unitOnGroupService.delete(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit Delete',
            order: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: DeleteUnitOnGroupDto = {
          unitOnGroupId: unit.id,
        };

        const deleted = await unitOnGroupService.delete(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit Delete',
            order: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: DeleteUnitOnGroupDto = {
          unitOnGroupId: unit.id,
        };

        const deleted = await unitOnGroupService.delete(dto, user);
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
              title: 'กลุ่มลับ',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            groupOnSubjectId: group.id,
            subjectId: subject.id,
            schoolId: school.id,
            title: 'Unit Delete',
            order: 0,
            icon: 'icon.png',
            description: 'หัวข้อทดสอบ',
          },
        });

        const dto: DeleteUnitOnGroupDto = {
          unitOnGroupId: unit.id,
        };

        const deleted = await unitOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });
});
