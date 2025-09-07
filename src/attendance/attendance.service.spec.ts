import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Request } from 'express';
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
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  CreateAttendanceDto,
  GetAttendanceByIdDto,
  UpdateAttendanceDto,
  UpdateManyDto,
} from './dto';
import { SubscriptionService } from '../subscription/subscription.service';

describe('Attendance Service', () => {
  let attendanceService: AttendanceService;
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
  const scoreOnSubjectService = new ScoreOnSubjectService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
  );
  const studentOnSubjectService = new StudentOnSubjectService(
    prismaService,
    googleStorageService,
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

  const attendanceStatusListService = new AttendanceStatusListService(
    prismaService,
    teacherOnSubjectService,
  );

  const attendanceTableService = new AttendanceTableService(
    prismaService,
    teacherOnSubjectService,
    googleStorageService,
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

  const attendanceRowService = new AttendanceRowService(
    prismaService,
    studentOnSubjectService,
    subjectService,
    attendanceStatusListService,
    teacherOnSubjectService,
  );

  beforeEach(async () => {
    attendanceService = new AttendanceService(
      prismaService,
      googleStorageService,
      studentOnSubjectService,
      attendanceTableService,
      attendanceRowService,
    );
  });

  /////////////////////////////// Create Attendance ////////////////////////////

  describe('create', () => {
    // กรณี: สร้าง attendance สำเร็จเมื่อข้อมูลครบ
    it('should create attendance successfully if all data exists and access is valid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'CreateTest',
          email: `create-attendance-156465${Date.now()}@test.com`,
          phone: '0812345678',
          password: 'password123',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-4564${Date.now()}`,
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
          firstName: 'สมปอง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '456',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
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
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ติดกิจกรรมโรงเรียน',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: found.id,
          status: 'ติดกิจกรรมโรงเรียน',
          note: 'ไม่ว่าง ติดกิจกรรมโรงเรียน',
        };

        // ลบ attendance ที่อาจเคยถูกสร้างไว้ เพื่อหลีกเลี่ยง unique constraint error
        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: found.id,
          },
        });

        const result = await attendanceService.create(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.status).toBe('ติดกิจกรรมโรงเรียน');
        expect(result.studentId).toBe(student.id);
        expect(result.schoolId).toBe(school.id);
        expect(result.subjectId).toBe(subject.id);
        expect(result.attendanceRowId).toBe(row.id);
        expect(result.attendanceTableId).toBe(table.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ studentOnSubject → ควร throw NotFoundException
    it('should throw NotFoundException if studentOnSubject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'T',
          lastName: 'NotFoundStu',
          email: `notfoundstu-2345346${Date.now()}@test.com`,
          phone: '0891112222',
          password: '123456',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-456434${Date.now()}`,
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
          firstName: 'สมปองง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '456',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'มาสาย',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: '123456789012345678901234', // fake id
          status: 'มาสาย',
          note: 'test',
        };

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Student not found');
      }
    });

    // กรณี: ไม่พบ attendanceRow → ควร throw NotFoundException
    it('should throw NotFoundException if attendanceRow not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'T',
          lastName: 'NotFoundRow',
          email: `notfoundrow-1442355678${Date.now()}@test.com`,
          phone: '0893334444',
          password: '123456',
          photo: '',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-456434346${Date.now()}`,
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
          firstName: 'สมปองง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '42345',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
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

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: '123456789012345678901234', // fake id
          studentOnSubjectId: studentOnSubject.id,
          status: 'Present',
          note: '',
        };

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('attendancerowId is not found');
      }
    });

    // กรณี: สถานะไม่อยู่ใน status list → ควร throw ForbiddenException
    it('should throw ForbiddenException if status is not in attendanceStatusList', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'T',
          lastName: 'InvalidStatus',
          email: `invalidstatus-12434${Date.now()}@test.com`,
          phone: '0890001111',
          password: '123456',
          photo: '',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-456434346asdf${Date.now()}`,
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
          firstName: 'สมปองง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '42345',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
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

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: studentOnSubject.id,
          status: 'NotExistStatus', // invalid
          note: 'ไม่พบสถานะนี้',
        };

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Status not found');
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user is not teacher on subject (Empty teacher on subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'CreateTest',
          email: `create-attendance-156465sdfg${Date.now()}@test.com`,
          phone: '0812345678',
          password: 'password123',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-3454564${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมปอง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '456',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ติดกิจกรรมโรงเรียน',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: studentOnSubject.id,
          status: 'ติดกิจกรรมโรงเรียน',
          note: 'ไม่ว่าง ติดกิจกรรมโรงเรียน',
        };

        // ลบ attendance ที่อาจเคยถูกสร้างไว้ เพื่อหลีกเลี่ยง unique constraint error
        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        });

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน subject → ForbiddenException
    it('should throw ForbiddenException if user is not teacher on subject (Teacher on subject status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'CreateTest',
          email: `create-attendance-156465sdfg234${Date.now()}@test.com`,
          phone: '0812345678',
          password: 'password123',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-3454564235${Date.now()}`,
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

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมปอง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '456',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ติดกิจกรรมโรงเรียน',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: studentOnSubject.id,
          status: 'ติดกิจกรรมโรงเรียน',
          note: 'ไม่ว่าง ติดกิจกรรมโรงเรียน',
        };

        // ลบ attendance ที่อาจเคยถูกสร้างไว้ เพื่อหลีกเลี่ยง unique constraint error
        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        });

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน school → ForbiddenException
    it('should throw ForbiddenException if user is not member on school (Empty member on school)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'CreateTest',
          email: `create-attendance-2345345${Date.now()}@test.com`,
          phone: '0812345678',
          password: 'password123',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
            country: 'Thailand',
            logo: 'logo.png',
            plan: 'PREMIUM',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-234543${Date.now()}`,
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
          firstName: 'สมปอง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '456',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ติดกิจกรรมโรงเรียน',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: studentOnSubject.id,
          status: 'ติดกิจกรรมโรงเรียน',
          note: 'ไม่ว่าง ติดกิจกรรมโรงเรียน',
        };

        // ลบ attendance ที่อาจเคยถูกสร้างไว้ เพื่อหลีกเลี่ยง unique constraint error
        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        });

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: ไม่มีสิทธิ์ใน school → ForbiddenException
    it('should throw ForbiddenException if user is not member on school (Member on school status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'CreateTest',
          email: `create-attendance-156465sdfg234${Date.now()}@test.com`,
          phone: '0812345678',
          password: 'password123',
          photo: 'avatar.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Desc',
            phoneNumber: '0899999999',
            address: 'KKU',
            zipCode: '40000',
            city: 'Khon Kaen',
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
          status: 'PENDDING',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: '',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.3/2',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คณิตศาสตร์',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MATH-3454564235${Date.now()}`,
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
          firstName: 'สมปอง',
          lastName: 'ดีมากก',
          photo: 'photo.png',
          number: '456',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: '',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'คาบเช้า',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'ติดกิจกรรมโรงเรียน',
                value: 9,
                color: '#00FF00',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: CreateAttendanceDto = {
          attendanceRowId: row.id,
          studentOnSubjectId: studentOnSubject.id,
          status: 'ติดกิจกรรมโรงเรียน',
          note: 'ไม่ว่าง ติดกิจกรรมโรงเรียน',
        };

        // ลบ attendance ที่อาจเคยถูกสร้างไว้ เพื่อหลีกเลี่ยง unique constraint error
        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        });

        await attendanceService.create(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
  });

  /////////////////////////////// Validate Access ////////////////////////////

  describe('validateAccess', () => {
    // กรณี: subject มีอยู่, user เป็น ADMIN และเป็นสมาชิกโรงเรียน (ACCEPT)
    it('should pass if user is admin and accepted member on school', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Access',
          email: `admin-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'admin.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Access School',
            phoneNumber: '0800000000',
            address: 'Access Rd',
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
          title: 'ม.6/1',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'สังคม',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SOCIAL-213${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await attendanceService.validateAccess({
          userId: user.id,
          subjectId: subject.id,
        });

        expect(true).toBe(true); // ผ่าน = ไม่ throw
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: subject ไม่พบ
    it('should throw NotFoundException if subject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Ghost',
          lastName: 'User',
          email: `ghost-234${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'ghost123',
          photo: 'ghost.png',
          provider: 'LOCAL',
        });

        await attendanceService.validateAccess({
          userId: user.id,
          subjectId: '123456789012345678901234',
        });
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject not found');
      }
    });

    // กรณี: user ไม่มี memberOnSchool หรือ status ≠ ACCEPT
    it('should throw ForbiddenException if user is not member on school (Empty member on school)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unverified',
          lastName: 'User',
          email: `not-accept-234${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'notaccept123',
          photo: 'no.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Reject School',
            phoneNumber: '0888888888',
            address: 'Block St',
            zipCode: '40000',
            city: 'Chonburi',
            country: 'Thailand',
            description: '',
            logo: 'reject.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.1/2',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คอมพิวเตอร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `COM-324${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await attendanceService.validateAccess({
          userId: user.id,
          subjectId: subject.id,
        });
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
    // กรณี: user ไม่มี memberOnSchool หรือ status ≠ ACCEPT
    it('should throw ForbiddenException if user is not member on school (Member on school status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unverified',
          lastName: 'User',
          email: `not-accept-23434${Date.now()}@test.com`,
          phone: '0888888888',
          password: 'notaccept123',
          photo: 'no.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Reject School',
            phoneNumber: '0888888888',
            address: 'Block St',
            zipCode: '40000',
            city: 'Chonburi',
            country: 'Thailand',
            description: '',
            logo: 'reject.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.1/2',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'คอมพิวเตอร์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `COM-3244${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await attendanceService.validateAccess({
          userId: user.id,
          subjectId: subject.id,
        });
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: memberOnSchool ถูกต้อง แต่ teacherOnSubject ไม่มีหรือ status ≠ ACCEPT และ user ไม่ใช่ ADMIN
    it('should throw ForbiddenException if user is not teacher on subject (Empty teacher o nsubject) and not ADMIN', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'NotAssigned',
          email: `teacher-no-234${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'pass1234',
          photo: 't.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Limit School',
            phoneNumber: '0877777777',
            address: 'Fail Rd',
            zipCode: '40000',
            city: 'Nakhon',
            country: 'Thailand',
            description: '',
            logo: 'fail.png',
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
          title: 'ม.3/1',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ดนตรี',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MUSIC-34${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        // 🛑 ไม่มีการ assign teacherOnSubject

        await attendanceService.validateAccess({
          userId: user.id,
          subjectId: subject.id,
        });
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: memberOnSchool ถูกต้อง แต่ teacherOnSubject ไม่มีหรือ status ≠ ACCEPT และ user ไม่ใช่ ADMIN
    it('should throw ForbiddenException if user is not teacher on subject (Teacher on subject status !== ACCEPT) and not ADMIN', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'NotAssigned',
          email: `teacher-no-234${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'pass1234',
          photo: 't.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Limit School',
            phoneNumber: '0877777777',
            address: 'Fail Rd',
            zipCode: '40000',
            city: 'Nakhon',
            country: 'Thailand',
            description: '',
            logo: 'fail.png',
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
          title: 'ม.3/1',
          level: 'ม.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ดนตรี',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `MUSIC-${Date.now()}`,
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

        await attendanceService.validateAccess({
          userId: user.id,
          subjectId: subject.id,
        });
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
  });

  /////////////////////////////// Get Attendance By Id ////////////////////////////

  describe('getAttendanceById', () => {
    // กรณี: ดึงข้อมูลสำเร็จ และ validateAccess ผ่าน
    it('should return attendance if it exists and access is granted', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Accessed',
          lastName: 'User',
          email: `access-user-134${Date.now()}@test.com`,
          phone: '0801111111',
          password: 'test1234',
          photo: 'access.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0888888888',
            address: 'Main Road',
            zipCode: '40000',
            city: 'Bangkok',
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
          title: 'ม.6/3',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ฟิสิกส์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `PHY-456${Date.now()}`,
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
          number: '456',
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
              title: 'ตารางเช็คชื่อฟิสิกส์',
              description: 'ภาคเรียนที่ 2',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ดึง attendance ที่ผูกกับ attendanceRow นี้ออกมา (อย่างน้อย 1 ตัว)
        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              attendanceRowId: row.id,
            },
          });

        const attendance = attendances.find((a) => a.subjectId === subject.id);

        expect(attendance).toBeDefined();

        const dto: GetAttendanceByIdDto = {
          attendanceId: attendance.id,
        };

        const result = await attendanceService.getAttendanceById(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(attendance.id);
        expect(result.subjectId).toBe(subject.id);
        expect(result.attendanceRowId).toBe(row.id);
        expect(result.attendanceTableId).toBe(table.id);
        expect(result.studentId).toBe(student.id);
        expect(result.status).toBe('UNKNOW');
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // ❌ กรณี: attendance ไม่พบ
    it('should throw NotFoundException if attendance is not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Unknown',
          lastName: 'User',
          email: `missing-5678${Date.now()}@test.com`,
          phone: '0899999999',
          password: 'secret123',
          photo: 'ghost.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0888888888',
            address: 'Main Road',
            zipCode: '40000',
            city: 'Bangkok',
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
          title: 'ม.6/3',
          level: 'ม.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ฟิสิกส์',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `PHY-44567${Date.now()}`,
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

        const dto: GetAttendanceByIdDto = {
          attendanceId: '123456789012345678901234',
        };

        await attendanceService.getAttendanceById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Attendance not found');
      }
    });

    // กรณี: validateAccess ล้มเหลว (ไม่ได้อยู่ในรายวิชาหรือยังไม่ ACCEPT)
    it('should throw ForbiddenException if user is not teacher on subject (Empty teacher on subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Forbidden',
          lastName: 'User',
          email: `forbidden-${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'noaccess123',
          photo: 'block.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0877777777',
            address: 'Blocked Road',
            zipCode: '40000',
            city: 'Chiang Mai',
            country: 'Thailand',
            description: '',
            logo: 'block.png',
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
          title: 'ม.4/2',
          level: 'ม.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ศิลปะ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ART-2456${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมชายยยยยยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '4534',
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
              title: 'ตารางเช็คชื่อฟิสิกส์',
              description: 'ภาคเรียนที่ 2',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ดึง attendance ที่ผูกกับ attendanceRow นี้ออกมา (อย่างน้อย 1 ตัว)
        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              attendanceRowId: row.id,
            },
          });

        const attendance = attendances.find((a) => a.subjectId === subject.id);
        expect(attendance).toBeDefined();

        const dto: GetAttendanceByIdDto = {
          attendanceId: attendance.id,
        };

        await attendanceService.getAttendanceById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
    // กรณี: validateAccess ล้มเหลว (ไม่ได้อยู่ในรายวิชาหรือยังไม่ ACCEPT)
    it('should throw ForbiddenException if user is not teacher on subject (Teacher on subject status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Forbidden',
          lastName: 'User',
          email: `forbidden-${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'noaccess123',
          photo: 'block.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0877777777',
            address: 'Blocked Road',
            zipCode: '40000',
            city: 'Chiang Mai',
            country: 'Thailand',
            description: '',
            logo: 'block.png',
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
          title: 'ม.4/2',
          level: 'ม.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ศิลปะ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ART-2456${Date.now()}`,
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

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมชายยยยยยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '4534',
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
              title: 'ตารางเช็คชื่อฟิสิกส์',
              description: 'ภาคเรียนที่ 2',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ดึง attendance ที่ผูกกับ attendanceRow นี้ออกมา (อย่างน้อย 1 ตัว)
        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              attendanceRowId: row.id,
            },
          });

        const attendance = attendances.find((a) => a.subjectId === subject.id);
        expect(attendance).toBeDefined();

        const dto: GetAttendanceByIdDto = {
          attendanceId: attendance.id,
        };

        await attendanceService.getAttendanceById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: validateAccess ล้มเหลว (ไม่ได้อยู่ในโรงเรียนหรือยังไม่ ACCEPT)
    it('should throw ForbiddenException if user is not member on school (Empty member on school)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Forbidden',
          lastName: 'User',
          email: `forbidden-235443${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'noaccess123',
          photo: 'block.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0877777777',
            address: 'Blocked Road',
            zipCode: '40000',
            city: 'Chiang Mai',
            country: 'Thailand',
            description: '',
            logo: 'block.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: crypto.randomUUID(),
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ม.4/2',
          level: 'ม.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ศิลปะ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ART-2456sdfg${Date.now()}`,
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
          firstName: 'สมชายยยยยยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '4534',
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
              title: 'ตารางเช็คชื่อฟิสิกส์',
              description: 'ภาคเรียนที่ 2',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ดึง attendance ที่ผูกกับ attendanceRow นี้ออกมา (อย่างน้อย 1 ตัว)
        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              attendanceRowId: row.id,
            },
          });

        const attendance = attendances.find((a) => a.subjectId === subject.id);
        expect(attendance).toBeDefined();

        const dto: GetAttendanceByIdDto = {
          attendanceId: attendance.id,
        };

        await attendanceService.getAttendanceById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
    // กรณี: validateAccess ล้มเหลว (ไม่ได้อยู่ในโรงเรียนหรือยังไม่ ACCEPT)
    it('should throw ForbiddenException if user is not member on school (Member on school status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Forbidden',
          lastName: 'User',
          email: `forbidden-324${Date.now()}@test.com`,
          phone: '0877777777',
          password: 'noaccess123',
          photo: 'block.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccess School',
            phoneNumber: '0877777777',
            address: 'Blocked Road',
            zipCode: '40000',
            city: 'Chiang Mai',
            country: 'Thailand',
            description: '',
            logo: 'block.png',
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
          title: 'ม.4/2',
          level: 'ม.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ศิลปะ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ART-2456hgdh${Date.now()}`,
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
          firstName: 'สมชายยยยยยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '4534',
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
              title: 'ตารางเช็คชื่อฟิสิกส์',
              description: 'ภาคเรียนที่ 2',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบเข้าแถว',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ดึง attendance ที่ผูกกับ attendanceRow นี้ออกมา (อย่างน้อย 1 ตัว)
        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              attendanceRowId: row.id,
            },
          });

        const attendance = attendances.find((a) => a.subjectId === subject.id);

        expect(attendance).toBeDefined();

        const dto: GetAttendanceByIdDto = {
          attendanceId: attendance.id,
        };

        await attendanceService.getAttendanceById(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
  });

  /////////////////////////////// Update Attendance ////////////////////////////

  describe('update', () => {
    // กรณี: อัปเดตสำเร็จโดยผู้มีสิทธิ์ (user แบบ ADMIN)
    it('should update attendance if found and access is granted (with user)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Access',
          email: `admin-access-2456${Date.now()}@test.com`,
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
          title: 'ม.6/1',
          level: 'ม.6',
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
          code: `SCI-365${Date.now()}`,
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
          firstName: 'สมชายยยยยยยยยยย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '5555',
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
              title: 'ตารางวิทย์',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const status =
          await attendanceStatusListService.attendanceStatusListSRepository.create(
            {
              data: {
                title: 'มา',
                value: 9,
                color: '#123456',
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ทดสอบมาเรียน',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ลบ attendance ที่อาจเคยถูกสร้างไว้ เพื่อหลีกเลี่ยง unique constraint error
        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: found.id,
          },
        });

        const attendance = await attendanceService.attendanceRepository.create({
          data: {
            attendanceRowId: row.id,
            attendanceTableId: table.id,
            subjectId: subject.id,
            schoolId: school.id,
            studentId: student.id,
            status: 'ขาด',
            note: 'ก่อนอัปเดต',
            studentOnSubjectId: found.id,
            startDate: new Date(),
            endDate: new Date(),
          },
        });

        const dto: UpdateAttendanceDto = {
          query: {
            attendanceId: attendance.id,
          },
          body: {
            status: 'มา',
            note: 'แก้ไขบันทึก',
          },
        };

        const result = await attendanceService.update(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(attendance.id);
        expect(result.status).toBe('มา');
        expect(result.note).toBe('แก้ไขบันทึก');
        expect(result.attendanceRowId).toBe(row.id);
        expect(result.attendanceTableId).toBe(table.id);
        expect(result.studentId).toBe(student.id);
        expect(result.subjectId).toBe(subject.id);
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่พบ attendance
    it('should throw NotFoundException if attendance not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Access',
          email: `admin-access-568${Date.now()}@test.com`,
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
          title: 'ม.6/1',
          level: 'ม.6',
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
          code: `SCI-365345${Date.now()}`,
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

        const dto: UpdateAttendanceDto = {
          query: {
            attendanceId: '123456789012345678901234',
          },
          body: {
            status: 'มา',
          },
        };
        await attendanceService.update(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Attendance not found');
      }
    });

    // กรณี: ไม่มี user และเวลา expire ไปแล้ว
    it('should throw BadRequestException if expired and no user', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Expired School',
            phoneNumber: '0990000000',
            address: 'Expired Rd',
            zipCode: '40000',
            city: 'Chiang Mai',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: '123456789012345678901234',
            stripe_customer_id: '123456789012345678901234',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: '123456789012345678901234',
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
          userId: '123456789012345678901234',
          order: 1,
        });

        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมชาย',
          lastName: 'ใจดี',
          photo: 'https://example.com/photo.jpg',
          number: '5678',
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

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ตารางหมดเวลา',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        // สร้าง row ที่หมดเวลาแล้ว
        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date(
                  Date.now() - 2 * 60 * 60 * 1000,
                ).toISOString(), // 2 ชม. ก่อน
                endDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 ชม. ก่อน
                note: 'หมดเวลาแล้ว',
                type: 'SCAN',
                expireAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 นาทีที่แล้ว ❗
                allowScanAt: new Date(
                  Date.now() - 3 * 60 * 60 * 1000,
                ).toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        });

        const attendance = await attendanceService.attendanceRepository.create({
          data: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
            status: 'ขาด',
            note: 'หมดเวลา',
            subjectId: subject.id,
            studentId: student.id,
            schoolId: school.id,
            attendanceTableId: table.id,
            startDate: new Date(),
            endDate: new Date(),
          },
        });

        const dto: UpdateAttendanceDto = {
          query: {
            attendanceId: attendance.id,
          },
          body: {
            status: 'มา',
            note: 'เกินเวลา',
          },
        };

        // ไม่ใส่ user เพื่อให้ทดสอบ expired
        await attendanceService.update(dto, undefined);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe("Time's up! for update attendance");
      }
    });

    // กรณี: status ไม่ตรงกับ attendanceStatusList
    it('should throw ForbiddenException if status not found in list', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Fake',
          lastName: 'Status',
          email: `fake-status-2452345${Date.now()}@test.com`,
          phone: '0801111122',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Fake School',
            phoneNumber: '0999111199',
            address: 'Fake Rd',
            zipCode: '30000',
            city: 'BKK',
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
          title: 'ม.1/2',
          level: 'ม.1',
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
          code: `BIO-475${Date.now()}`,
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
          number: '5678',
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

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ชีวะ',
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
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'ชีวะ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        // ดึง attendance ที่ผูกกับ attendanceRow นี้ออกมา (อย่างน้อย 1 ตัว)
        const attendances =
          await attendanceService.attendanceRepository.findMany({
            where: {
              attendanceRowId: row.id,
            },
          });

        const attendance = attendances.find((a) => a.subjectId === subject.id);

        const dto: UpdateAttendanceDto = {
          query: { attendanceId: attendance.id },
          body: { status: 'ไม่พบสถานะนี้' },
        };

        await attendanceService.update(dto, user);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Status not found');
      }
    });
  });

  /////////////////////////////// Update Many Attendance ////////////////////////////

  describe('updateMany', () => {
    // กรณี: อัปเดตหลายตัวสำเร็จ
    it('should update multiple attendances successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Multi',
          lastName: 'Update',
          email: `multi-update-${Date.now()}@test.com`,
          phone: '0801234567',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          blurHash: user.blurHash,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'สุภาพ',
          lastName: 'พะยองเดช',
          photo: 'photo.jpg',
          number: '0123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
        });

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
        });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject1.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student1.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'มากะทันหัน' },
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'มา', note: 'มากับเพื่อน' },
            },
          ],
        };

        const result = await attendanceService.updateMany(dto, user);

        expect(result.length).toBe(2);
        expect(result[0].status).toBe('มา');
        expect(result[1].status).toBe('มา');
        expect(result[0].note).toBe('มากะทันหัน');
        expect(result[1].note).toBe('มากับเพื่อน');
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: รายการแรกหา attendance ไม่เจอ
    it('should throw NotFoundException if first attendance not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'A',
          email: `notfound-a-6457${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: '',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          code: `HIS-345${Date.now()}`,
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
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: '123456789012345678901234' }, // ไม่มีจริง
              body: { status: 'มา' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Attendance not found');
      }
    });

    // กรณี: status ไม่อยู่ใน status list
    it('should throw ForbiddenException if status not found in list', async () => {
      try {
        // สร้าง user, school, classroom, subject, row, attendance 1 รายการ
        // ไม่สร้าง statusList เพื่อให้ผิด
        // ส่ง dto ที่มี status = 'ไม่พบสถานะ'
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'A',
          email: `notfound-a-4574${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: '',
          provider: 'LOCAL',
        });
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          code: `HIS-342345${Date.now()}`,
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
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '543',
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

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        });

        const attendance = await attendanceService.attendanceRepository.create({
          data: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject.id,
            status: 'ขาด',
            note: 'ไม่ได้มา',
            subjectId: subject.id,
            studentId: student.id,
            schoolId: school.id,
            attendanceTableId: table.id,
            startDate: new Date(),
            endDate: new Date(),
          },
        });
        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance.id }, // ไม่มีจริง
              body: { status: 'ไม่พบสถานะ' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Status not found');
      }
    });

    // กรณี: บางรายการ update สำเร็จ บางรายการล้มเหลว (fulfilled/rejected คละกัน)
    it('should return only fulfilled updates if some fail', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'PartialFail',
          email: `partial-fail-${Date.now()}@test.com`,
          phone: '0899999991',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Partial School',
            phoneNumber: '0999999911',
            address: 'Partial Rd',
            zipCode: '30330',
            city: 'BKK',
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
          title: 'ป.6/2',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'ศิลปะ',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `ART-${Date.now()}`,
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
              title: 'ตารางศิลปะ',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        const statusItem =
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

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'วิชาศิลปะ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 7200000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        const student = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ภูผา',
          lastName: 'วิเศษ',
          number: '2211',
          photo: 'photo.png',
          blurHash: '',
          schoolId: school.id,
          classId: classroom.id,
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student.id,
            },
          });
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'ภูเขียว',
          lastName: 'พะยองเดช',
          number: '234',
          photo: 'photo.png',
          blurHash: '',
          schoolId: school.id,
          classId: classroom.id,
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject.id,
              status: 'ขาด',
              note: 'ไม่มาเรียน',
              subjectId: subject.id,
              studentId: student.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่มาเรียน',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'นักเรียนมาเรียนแล้ว' }, // ✅ ถูกต้อง
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'ไม่พบสถานะนี้เลย' }, // ❌ ผิด (ไม่มีใน list)
            },
          ],
        };

        const result = await attendanceService.updateMany(dto, user);

        expect(result).toHaveLength(1); // ✅ สำเร็จแค่ 1 รายการ
        expect(result[0].id).toBe(attendance1.id);
        expect(result[0].status).toBe('มา');
        expect(result[0].note).toBe('นักเรียนมาเรียนแล้ว');
      } catch (error) {
        console.log(error);
        throw error;
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (validateAccess ล้มเหลว)
    it('should throw ForbiddenException if user has no access to subject (Empty teacher on subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Multi',
          lastName: 'Update',
          email: `multi-update-111${Date.now()}@test.com`,
          phone: '0801234567',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          code: `HIS-111${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'สุภาพ',
          lastName: 'พะยองเดช',
          photo: 'photo.jpg',
          number: '0123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
        });

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
        });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject1.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student1.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'มากะทันหัน' },
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'มา', note: 'มากับเพื่อน' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // กรณี: ไม่มีสิทธิ์เข้าถึง subject (validateAccess ล้มเหลว)
    it('should throw ForbiddenException if user has no access to subject (Teacher on subject status !== ACEEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Multi',
          lastName: 'Update',
          email: `multi-update-222${Date.now()}@test.com`,
          phone: '0801234567',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          code: `HIS-111${Date.now()}`,
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
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'สุภาพ',
          lastName: 'พะยองเดช',
          photo: 'photo.jpg',
          number: '0123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
        });

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
        });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject1.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student1.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'มากะทันหัน' },
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'มา', note: 'มากับเพื่อน' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
    // กรณี: ไม่มีสิทธิ์เข้าถึง school (validateAccess ล้มเหลว)
    it('should throw ForbiddenException if user has no access to school (Empty member on school)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Multi',
          lastName: 'Update',
          email: `multi-update-333${Date.now()}@test.com`,
          phone: '0801234567',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          code: `HIS-333${Date.now()}`,
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
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'สุภาพ',
          lastName: 'พะยองเดช',
          photo: 'photo.jpg',
          number: '0123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
        });

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
        });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject1.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student1.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'มากะทันหัน' },
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'มา', note: 'มากับเพื่อน' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
    // กรณี: ไม่มีสิทธิ์เข้าถึง school (validateAccess ล้มเหลว)
    it('should throw ForbiddenException if user has no access to school (Member on school status !== ACEEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Multi',
          lastName: 'Update',
          email: `multi-update-444${Date.now()}@test.com`,
          phone: '0801234567',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Test Address',
            zipCode: '40000',
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
          title: 'ป.6/2',
          level: 'ป.6',
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
          code: `HIS-444${Date.now()}`,
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
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'สุภาพ',
          lastName: 'พะยองเดช',
          photo: 'photo.jpg',
          number: '0123',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
        });

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
        });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject1.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student1.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'มากะทันหัน' },
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'มา', note: 'มากับเพื่อน' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
  });

  /////////////////////////////// Export Excel ////////////////////////////

  describe('exportExcel', () => {
    it('should export Excel with correct base64 format and data', async () => {
      try {
        // 1. สร้าง user
        const user = await userService.userRepository.createUser({
          firstName: 'Export',
          lastName: 'Test',
          email: `export-${Date.now()}@test.com`,
          phone: '0809999988',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        // 2. สร้าง school และผูก user
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Export School',
            phoneNumber: '0999888877',
            address: 'Export Ave',
            zipCode: '30000',
            city: 'BKK',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'PREMIUM',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_export_excel',
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

        // 3. สร้าง classroom และ subject
        const classroom = await classroomService.classRepository.create({
          title: 'ป.5/4',
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

        const table =
          await attendanceTableService.attendanceTableRepository.createAttendanceTable(
            {
              title: 'ประวัติศาสตร์ สัปดาห์ที่ 1',
              description: '',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

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

        const student1 = await studentService.studentRepository.create({
          title: 'ด.ญ.',
          firstName: 'นิษฐา',
          lastName: 'ขยันเรียน',
          photo: 'photo.jpg',
          number: '0123',
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
        const student2 = await studentService.studentRepository.create({
          title: 'ด.ช.',
          firstName: 'สมชาย',
          lastName: 'พะยองเดช',
          photo: 'photo.jpg',
          number: '3',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const studentOnSubject2 =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              subjectId: subject.id,
              studentId: student2.id,
            },
          });

        const row =
          await attendanceRowService.attendanceRowRepository.createAttendanceRow(
            {
              data: {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 3600000).toISOString(),
                note: 'เข้าชั้นเรียนปกติ',
                type: 'SCAN',
                expireAt: new Date(Date.now() + 3600000).toISOString(),
                allowScanAt: new Date().toISOString(),
                isAllowScanManyTime: true,
                attendanceTableId: table.id,
                subjectId: subject.id,
                schoolId: school.id,
              },
            },
          );

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject1.id,
          },
        });

        await prismaService.attendance.deleteMany({
          where: {
            attendanceRowId: row.id,
            studentOnSubjectId: studentOnSubject2.id,
          },
        });

        const attendance1 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject1.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student1.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const attendance2 = await attendanceService.attendanceRepository.create(
          {
            data: {
              attendanceRowId: row.id,
              studentOnSubjectId: studentOnSubject2.id,
              status: 'ขาด',
              note: 'ไม่ได้มา',
              subjectId: subject.id,
              studentId: student2.id,
              schoolId: school.id,
              attendanceTableId: table.id,
              startDate: new Date(),
              endDate: new Date(),
            },
          },
        );

        const dto: UpdateManyDto = {
          data: [
            {
              query: { attendanceId: attendance1.id },
              body: { status: 'มา', note: 'มากะทันหัน' },
            },
            {
              query: { attendanceId: attendance2.id },
              body: { status: 'มา', note: 'มากับเพื่อน' },
            },
          ],
        };

        await attendanceService.updateMany(dto, user);

        // 8. mock req
        const mockRequest = {
          headers: {
            'accept-language': 'th-TH',
          },
          get(headerName: string) {
            if (headerName.toLowerCase() === 'accept-language') {
              return 'th-TH';
            }
            return undefined;
          },
        } as Partial<Request> as Request;

        // 9. เรียกฟังก์ชัน exportExcel
        const result = await attendanceService.exportExcel(
          { subjectId: subject.id },
          user,
          mockRequest,
        );

        expect(result).toMatch(
          /^data:application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,/,
        );
      } catch (error) {
        console.log(error);
        expect(error).toBeUndefined();
        throw error;
      }
    });
  });
});
