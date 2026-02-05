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
import {
  CreateStudentOnGroupDto,
  DeleteStudentOnGroupDto,
  UpdateStudentOnGroupDto,
} from './dto';
import { StudentOnGroupService } from './student-on-group.service';
import { StorageService } from '../storage/storage.service';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

describe('Student On Group Service', () => {
  let studentOnGroupService: StudentOnGroupService;
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
  const unitOnGroupService = new UnitOnGroupService(
    prismaService,
    teacherOnSubjectService,
    groupOnSubjectService,
  );

  beforeEach(async () => {
    studentOnGroupService = new StudentOnGroupService(
      prismaService,
      teacherOnSubjectService,
      unitOnGroupService,
      studentOnSubjectService,
    );
  });

  /////////////////////////////// Create Student On Group ////////////////////////////

  describe('create', () => {
    // กรณีสร้างสำเร็จ (คุณทำไว้แล้ว)
    it('should create StudentOnGroup successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-111${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-111${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
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

        const dto: CreateStudentOnGroupDto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: studentOnSubject.id,
        };

        const result = await studentOnGroupService.create(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.unitOnGroupId).toBe(unit.id);
        expect(result.studentOnSubjectId).toBe(studentOnSubject.id);
        expect(result.studentId).toBe(student.id);
        expect(result.subjectId).toBe(subject.id);
        expect(result.schoolId).toBe(school.id);
        expect(result.groupOnSubjectId).toBe(group.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ กรณี: ไม่พบ unit
    it('should throw BadRequestException if unit not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-222${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-222${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 2',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'แอน',
          lastName: 'วดี',
          photo: 'photo.jpg',
          number: '0002',
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

        const dto = {
          unitOnGroupId: '123456789012345678901234',
          studentOnSubjectId: studentOnSubject.id,
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Unit or Student ID is invaild');
      }
    });

    // ❌ กรณี: ไม่พบ studentOnSubject
    it('should throw BadRequestException if studentOnSubject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-333${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-333${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 3',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 3',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 2,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'ชบา',
          lastName: 'ชมพู',
          photo: 'photo.jpg',
          number: '0003',
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

        const dto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: '123456789012345678901234',
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Unit or Student ID is invaild');
      }
    });

    // ❌ กรณี: subjectId ของ student กับ unit ไม่ตรงกัน
    it('should throw BadRequestException if subjectId mismatch', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Mismatch',
          email: `admin-mismatch-${Date.now()}@test.com`,
          phone: '0800000013',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          title: 'ป.5/1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject1 = await subjectService.subjectRepository.createSubject({
          title: 'ฟิสิกส์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `PHY-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject1.id,
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
          firstName: 'ต้น',
          lastName: 'ไม้',
          photo: 'photo.jpg',
          number: '0005',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject1.id,
              studentId: student.id,
            },
          });

        const subject2 = await subjectService.subjectRepository.createSubject({
          title: 'ชีวะ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `BIO-2${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 2,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject2.id,
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
              title: 'กลุ่มชีวะ',
              subjectId: subject2.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทชีวะ 1',
            description: 'ชีวะพื้นฐาน',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject2.id } },
            school: { connect: { id: subject2.schoolId } },
          },
        });

        const dto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: studentOnSubject.id,
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'SubjectId of both student and unit should be the same',
        );
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-777${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-777${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
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

        const dto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: studentOnSubject.id,
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-888${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-888${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
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

        const dto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: studentOnSubject.id,
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-999${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
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
          code: `SCI-999${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
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

        const dto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: studentOnSubject.id,
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-000${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          status: 'PENDDING',
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
          code: `SCI-000${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
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

        const dto = {
          unitOnGroupId: unit.id,
          studentOnSubjectId: studentOnSubject.id,
        };

        await studentOnGroupService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Reorder Student On Group ////////////////////////////

  describe('reorder', () => {
    // ✅ ทดสอบกรณี: ผู้ใช้ที่มีสิทธิ์สามารถสลับลำดับ studentOnGroup ได้สำเร็จ
    it('should reorder studentOnGroups successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Reorder',
          email: `admin-reorder-111${Date.now()}@test.com`,
          phone: '0800000012',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          title: 'ป.5/1',
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
          code: `MATH-111${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: '',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject.id } },
            school: { connect: { id: school.id } },
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'สอง',
          lastName: 'สมบูรณ์',
          number: '002',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        // ดึงข้อมูลการลงทะเบียนวิชาของนักเรียนทั้งสอง
        const [ss1, ss2] = await Promise.all([
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student1.id },
          }),
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student2.id },
          }),
        ]);

        // สร้างความสัมพันธ์ StudentOnGroup ให้กับทั้งสองคนในหน่วยเดียวกัน
        const [sog1, sog2] = await Promise.all([
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss1.id },
            user,
          ),
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss2.id },
            user,
          ),
        ]);

        // ทดสอบการ reorder โดยสลับตำแหน่งของ sog1 กับ sog2
        const result = await studentOnGroupService.reorder(
          { studentOnGroupIds: [sog2.id, sog1.id] },
          user,
        );

        // ตรวจสอบว่าจำนวนผลลัพธ์ถูกต้อง และค่าลำดับ (order) เปลี่ยนตามที่คาดหวัง
        expect(result).toHaveLength(2);
        const reordered = result.find((r) => r.id === sog2.id);
        expect(reordered.order).toBe(0); // sog2 ควรอยู่ลำดับแรก
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ ทดสอบกรณี: ส่ง studentOnGroupId ที่ไม่มีอยู่จริง → ควรโยน NotFoundException
    it('should throw NotFoundException if first studentOnGroup is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Invalid',
          email: `invalid-reorder-222${Date.now()}@test.com`,
          phone: '0800000015',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          title: 'ป.5/1',
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
          code: `MATH-111${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่ม A',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: '',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject.id } },
            school: { connect: { id: school.id } },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '007',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const studentOnGroup1 = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        await studentOnGroupService.reorder(
          {
            studentOnGroupIds: ['123456789012345678901234', studentOnGroup1.id],
          },
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('One of the unitOnGroupId is invaild');
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-777${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-777${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'สอง',
          lastName: 'สมบูรณ์',
          number: '002',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        // ดึงข้อมูลการลงทะเบียนวิชาของนักเรียนทั้งสอง
        const [ss1, ss2] = await Promise.all([
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student1.id },
          }),
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student2.id },
          }),
        ]);

        // สร้างความสัมพันธ์ StudentOnGroup ให้กับทั้งสองคนในหน่วยเดียวกัน
        const [sog1, sog2] = await Promise.all([
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss1.id },
            user,
          ),
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss2.id },
            user,
          ),
        ]);

        // ทดสอบการ reorder โดยสลับตำแหน่งของ sog1 กับ sog2
        const result = await studentOnGroupService.reorder(
          { studentOnGroupIds: [sog2.id, sog1.id] },
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-888${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-888${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'สอง',
          lastName: 'สมบูรณ์',
          number: '002',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        // ดึงข้อมูลการลงทะเบียนวิชาของนักเรียนทั้งสอง
        const [ss1, ss2] = await Promise.all([
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student1.id },
          }),
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student2.id },
          }),
        ]);

        // สร้างความสัมพันธ์ StudentOnGroup ให้กับทั้งสองคนในหน่วยเดียวกัน
        const [sog1, sog2] = await Promise.all([
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss1.id },
            user,
          ),
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss2.id },
            user,
          ),
        ]);

        // ทดสอบการ reorder โดยสลับตำแหน่งของ sog1 กับ sog2
        const result = await studentOnGroupService.reorder(
          { studentOnGroupIds: [sog2.id, sog1.id] },
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-999${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
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
          code: `SCI-999${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'สอง',
          lastName: 'สมบูรณ์',
          number: '002',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        // ดึงข้อมูลการลงทะเบียนวิชาของนักเรียนทั้งสอง
        const [ss1, ss2] = await Promise.all([
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student1.id },
          }),
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student2.id },
          }),
        ]);

        // สร้างความสัมพันธ์ StudentOnGroup ให้กับทั้งสองคนในหน่วยเดียวกัน
        const [sog1, sog2] = await Promise.all([
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss1.id },
            user,
          ),
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss2.id },
            user,
          ),
        ]);

        // ทดสอบการ reorder โดยสลับตำแหน่งของ sog1 กับ sog2
        const result = await studentOnGroupService.reorder(
          { studentOnGroupIds: [sog2.id, sog1.id] },
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-000${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          status: 'PENDDING',
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
          code: `SCI-000${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const student2 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'สอง',
          lastName: 'สมบูรณ์',
          number: '002',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        // ดึงข้อมูลการลงทะเบียนวิชาของนักเรียนทั้งสอง
        const [ss1, ss2] = await Promise.all([
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student1.id },
          }),
          studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { subjectId: subject.id, studentId: student2.id },
          }),
        ]);

        // สร้างความสัมพันธ์ StudentOnGroup ให้กับทั้งสองคนในหน่วยเดียวกัน
        const [sog1, sog2] = await Promise.all([
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss1.id },
            user,
          ),
          studentOnGroupService.create(
            { unitOnGroupId: unit.id, studentOnSubjectId: ss2.id },
            user,
          ),
        ]);

        // ทดสอบการ reorder โดยสลับตำแหน่งของ sog1 กับ sog2
        const result = await studentOnGroupService.reorder(
          { studentOnGroupIds: [sog2.id, sog1.id] },
          user,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Update Student On Group ////////////////////////////

  describe('update', () => {
    // ✅ กรณี: อัปเดต studentOnGroup สำเร็จเมื่อ user มีสิทธิ์
    it('should update studentOnGroup successfully with valid access', async () => {
      try {
        // สร้างผู้ใช้ที่เป็น ADMIN และสมาชิกโรงเรียน
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Update',
          email: `admin-update-${Date.now()}@test.com`,
          phone: '0800000099',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update School',
            phoneNumber: '0999999999',
            address: '456 Lane',
            zipCode: '30000',
            city: 'Bangkok',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทย์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SCI-${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มวิทย์',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'หน่วย 1',
            description: '',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject.id } },
            school: { connect: { id: school.id } },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: UpdateStudentOnGroupDto = {
          query: { studentOnGroupId: studentOnGroup.id },
          body: {
            unitOnGroupId: unit.id,
            order: 5,
          },
        };

        const result = await studentOnGroupService.update(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(studentOnGroup.id);
        expect(result.order).toBe(5);
        expect(result.unitOnGroupId).toBe(unit.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ กรณี: ไม่พบ studentOnGroup → ควรโยน NotFoundException
    it('should throw NotFoundException if studentOnGroup not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Fail',
          lastName: 'Case',
          email: `fail-case-3463${Date.now()}@test.com`,
          phone: '0800000100',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update School',
            phoneNumber: '0999999999',
            address: '456 Lane',
            zipCode: '30000',
            city: 'Bangkok',
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
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'วิทย์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SCI-${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มวิทย์',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'หน่วย 1',
            description: '',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject.id } },
            school: { connect: { id: school.id } },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: UpdateStudentOnGroupDto = {
          query: { studentOnGroupId: '123456789012345678901234' },
          body: {
            unitOnGroupId: unit.id,
            order: 1,
          },
        };

        await studentOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('One of the unitOnGroupId is invaild');
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-777${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-777${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: UpdateStudentOnGroupDto = {
          query: { studentOnGroupId: studentOnGroup.id },
          body: {
            unitOnGroupId: unit.id,
            order: 5,
          },
        };

        const result = await studentOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-888${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-888${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: UpdateStudentOnGroupDto = {
          query: { studentOnGroupId: studentOnGroup.id },
          body: {
            unitOnGroupId: unit.id,
            order: 5,
          },
        };

        const result = await studentOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-999${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
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
          code: `SCI-999${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: UpdateStudentOnGroupDto = {
          query: { studentOnGroupId: studentOnGroup.id },
          body: {
            unitOnGroupId: unit.id,
            order: 5,
          },
        };

        const result = await studentOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-000${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          status: 'PENDDING',
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
          code: `SCI-000${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: UpdateStudentOnGroupDto = {
          query: { studentOnGroupId: studentOnGroup.id },
          body: {
            unitOnGroupId: unit.id,
            order: 5,
          },
        };

        const result = await studentOnGroupService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });

  /////////////////////////////// Delete Student On Group ////////////////////////////

  describe('delete', () => {
    // ✅ ทดสอบกรณี: ลบ studentOnGroup สำเร็จ
    it('should delete studentOnGroup successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Delete',
          email: `admin-delete-${Date.now()}@test.com`,
          phone: '0800000099',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Main Street',
            zipCode: '10000',
            city: 'Bangkok',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.5/1',
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

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: '',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject.id } },
            school: { connect: { id: school.id } },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: DeleteStudentOnGroupDto = {
          studentOnGroupId: studentOnGroup.id,
        };

        const deleted = await studentOnGroupService.delete(dto, user);

        expect(deleted.id).toBe(studentOnGroup.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ ทดสอบกรณี: ไม่พบ studentOnGroup → ควรโยน NotFoundException
    it('should throw NotFoundException if studentOnGroup not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Delete',
          email: `admin-delete-${Date.now()}@test.com`,
          phone: '0800000100',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Main Street',
            zipCode: '10000',
            city: 'Bangkok',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.5/1',
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

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: '',
            icon: '',
            order: 1,
            groupOnSubject: { connect: { id: group.id } },
            subject: { connect: { id: subject.id } },
            school: { connect: { id: school.id } },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'หนึ่ง',
          lastName: 'สมบูรณ์',
          number: '0088',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: DeleteStudentOnGroupDto = {
          studentOnGroupId: studentOnGroup.id,
        };

        await studentOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('One of the unitOnGroupId is invaild');
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-777${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-777${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: DeleteStudentOnGroupDto = {
          studentOnGroupId: studentOnGroup.id,
        };

        const deleted = await studentOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-888${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          code: `SCI-888${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: DeleteStudentOnGroupDto = {
          studentOnGroupId: studentOnGroup.id,
        };

        const deleted = await studentOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Empty)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-999${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
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
          code: `SCI-999${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: DeleteStudentOnGroupDto = {
          studentOnGroupId: studentOnGroup.id,
        };

        const deleted = await studentOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ❌ กรณี: ไม่มีสิทธิ์เข้าถึง school
    it('should throw ForbiddenException if user has no access to school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Group',
          email: `admin-group-000${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: '123 Road',
            zipCode: '30000',
            city: 'Bangkok',
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
          status: 'PENDDING',
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
          code: `SCI-000${Date.now()}`,
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

        const group =
          await groupOnSubjectService.groupOnSubjectRepository.create({
            data: {
              title: 'กลุ่มที่ 1',
              subjectId: subject.id,
              schoolId: school.id,
            },
          });

        const unit = await unitOnGroupService.unitOnGroupRepository.create({
          data: {
            title: 'บทที่ 1',
            description: 'เนื้อหาเบื้องต้น',
            icon: 'https://example.com/unit.png',
            order: 1,
            groupOnSubject: {
              connect: { id: group.id },
            },
            subject: {
              connect: { id: subject.id },
            },
            school: {
              connect: { id: school.id },
            },
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'นักเรียน',
          lastName: 'ตัวอย่าง',
          number: '001',
          classId: classroom.id,
          schoolId: school.id,
          photo: 'photo.png',
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: { studentId: student.id, subjectId: subject.id },
          });

        const studentOnGroup = await studentOnGroupService.create(
          {
            unitOnGroupId: unit.id,
            studentOnSubjectId: studentOnSubject.id,
          },
          user,
        );

        const dto: DeleteStudentOnGroupDto = {
          studentOnGroupId: studentOnGroup.id,
        };

        const deleted = await studentOnGroupService.delete(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
  });
});
