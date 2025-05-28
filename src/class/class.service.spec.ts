import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Class, User } from '@prisma/client';
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
import { CreateClassDto } from './dto';
import { Stats } from 'fs';

describe('Class Service', () => {
  let classroomService: ClassService;
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

  beforeEach(async () => {
    classroomService = new ClassService(
      memberOnSchoolService,
      prismaService,
      emailService,
      pushService,
      googleStorageService,
      userService,
      schoolService,
    );
  });

  /////////////////////////////// createClass ////////////////////////////

  describe('createClass', () => {
    it('should create class successfully if user has access to school (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Somchai',
          lastName: 'Admin',
          email: 'admin+createclass@example.com',
          phone: '0999999999',
          photo: 'photo.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'New School',
            description: 'School for testing',
            phoneNumber: '0123456789',
            address: 'Test Address',
            zipCode: '10000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_class_create',
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

        const dto: CreateClassDto = {
          title: 'นักเรียนชั้นมัธยมศึกษาปีที่ 5/1',
          level: 'มัธยมศึกษาปีที่ 5',
          description: 'Mock class for testing',
          schoolId: school.id,
        };

        const result = await classroomService.createClass(dto, user);

        expect(result).toBeDefined();
        expect(result.title).toBe('นักเรียนชั้นมัธยมศึกษาปีที่ 5/1');
        expect(result.level).toBe('มัธยมศึกษาปีที่ 5');
        expect(result.description).toBe('Mock class for testing');
        expect(result.schoolId).toBe(school.id);
        expect(result.userId).toBe(user.id);
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if user has no access to school (Without MemberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'John',
          lastName: 'Outsider',
          email: 'noaccess+createclass@example.com',
          phone: '0988888888',
          photo: 'photo.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Restricted School',
            description: 'Test no access',
            phoneNumber: '0111111111',
            address: 'Test Rd',
            zipCode: '20000',
            country: 'Thailand',
            city: 'KKU',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_noaccess',
          },
        });

        const dto: CreateClassDto = {
          title: 'Test Class',
          level: 'ประถมศึกษาปีที่ 5',
          description: 'Mock class for testing',
          schoolId: school.id,
        };

        await classroomService.createClass(dto, user);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should throw ForbiddenException if user is a member but not ACCEPTED (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Pending',
          lastName: 'Member',
          email: 'pending+createclass@example.com',
          phone: '0966666666',
          photo: 'photo.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Pending School',
            description: 'Test pending access',
            phoneNumber: '0199999999',
            address: 'Somewhere',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CNX',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_pending',
          },
        });

        // สร้าง member แต่ยังไม่ได้ ACCEPT
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

        const dto: CreateClassDto = {
          title: 'Test Class',
          level: 'มัธยมศึกษาปีที่ 1',
          description: '',
          schoolId: school.id,
        };

        await classroomService.createClass(dto, user);
        fail('Expected ForbiddenException due to PENDING membership');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });

    it('should throw ForbiddenException if totalStorage exceeds limit', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Storage School',
            description: 'Testing totalStorage limit',
            phoneNumber: '0222222222',
            address: 'Limit Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            stripe_customer_id: 'cus_test_storage',
            limitTotalStorage: 100,
          },
        });

        await schoolService.ValidateLimit(school, 'totalStorage', 200);
        fail('Expected ForbiddenException due to totalStorage limit');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Your storage size is reaching the limit, please upgrade a plamn',
        );
      }
    });

    it('should throw ForbiddenException if class number exceeds limit', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Class Limit School',
            description: 'Testing class limit',
            phoneNumber: '0333333333',
            address: 'Limit Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'KKU',
            logo: 'logo.png',
            plan: 'FREE',
            stripe_customer_id: 'cus_test_class',
            limitClassNumber: 1,
          },
        });

        await schoolService.ValidateLimit(school, 'classes', 2);
        fail('Expected ForbiddenException due to class limit');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Class number has reached the limit');
      }
    });

    it('should throw ForbiddenException if members exceed limit', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Member Limit School',
            description: 'Testing member limit',
            phoneNumber: '0444444444',
            address: 'Limit Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            stripe_customer_id: 'cus_test_members',
            limitSchoolMember: 1,
          },
        });

        await schoolService.ValidateLimit(school, 'members', 3);
        fail('Expected ForbiddenException due to member limit');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Members on school has reached limit');
      }
    });

    it('should throw ForbiddenException if subject number exceeds limit', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Subject Limit School',
            description: 'Testing subject limit',
            phoneNumber: '0555555555',
            address: 'Limit Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'UB',
            logo: 'logo.png',
            plan: 'FREE',
            stripe_customer_id: 'cus_test_subjects',
            limitSubjectNumber: 2,
          },
        });

        await schoolService.ValidateLimit(school, 'subjects', 5);
        fail('Expected ForbiddenException due to subject limit');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Subject number has reached limit');
      }
    });
  });

  /////////////////////////////// validate Access ////////////////////////////

  describe('validateAccess', () => {
    it('should return class if provided and not achieved', async () => {
      try {
        const createdClass = await classroomService.classRepository.create({
          title: 'Science',
          level: 'ม.2',
          description: 'test',
          schoolId: '123456789012345678901234',
          userId: '123456789012345678901234',
        });

        const result = await classroomService.validateAccess({
          classroom: createdClass,
          classId: createdClass.id,
        });

        expect(result).toEqual(createdClass);
      } catch (error) {
        throw error;
      }
    });

    it('should fetch class by id if not provided in input and return it', async () => {
      try {
        const createdClass = await classroomService.classRepository.create({
          title: 'Science',
          level: 'ม.2',
          description: 'test',
          schoolId: '123456789012345678901234',
          userId: '123456789012345678901234',
        });

        const result = await classroomService.validateAccess({
          classId: createdClass.id,
        });

        expect(result.id).toBe(createdClass.id);
        expect(result.isAchieved).toBe(false);
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if class is achieved (classroom.isAchieved === true)', async () => {
      try {
        const createdClass = await classroomService.classRepository.create({
          title: 'History',
          level: 'ม.3',
          description: 'achieved test',
          schoolId: '123456789012345678901234',
          userId: '123456789012345678901234',
        });

        await classroomService.classRepository.update({
          where: { id: createdClass.id },
          data: { isAchieved: true },
        });

        await classroomService.validateAccess({
          classId: createdClass.id,
        });

        fail('Expected ForbiddenException for achieved class');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Class is achieved, It is read-only not allowed to update or make any changes',
        );
      }
    });
  });

  /////////////////////////////// get classroom by id ////////////////////////////

  describe('getById', () => {
    it('should return class and students if access is valid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Access',
          lastName: 'Allowed',
          email: 'access@getbyid.com',
          phone: '0911111111',
          photo: 'photo.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            description: 'School description',
            phoneNumber: '0123456789',
            address: '123 Main St',
            zipCode: '40000',
            country: 'Thailand',
            city: 'KKU',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_getbyid',
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
          title: 'นักเรียน ม.6/2',
          level: 'มัธยมศึกษาปีที่ 6',
          description: 'ทดสอบ getById',
          schoolId: school.id,
          userId: user.id,
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

        const result = await classroomService.getById(
          { classId: classroom.id },
          user,
        );

        expect(result.id).toBe(classroom.id);
        expect(result.title).toBe('นักเรียน ม.6/2');

        // ตรวจว่าในรายการ students มี student ที่เราสร้างอยู่จริง
        expect(result.students.length).toBeGreaterThan(0);

        const matchedStudent = result.students.find((s) => s.id === student.id);
        expect(matchedStudent).toBeDefined();
        expect(matchedStudent?.firstName).toBe('สมชาย');
        expect(matchedStudent?.lastName).toBe('ใจดี');
        expect(matchedStudent?.number).toBe('12');
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if class not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Ghost',
          lastName: 'User',
          email: 'notfound@getbyid.com',
          phone: '0922222222',
          photo: 'photo.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        await classroomService.getById(
          { classId: '123456789012345678901234' },
          user,
        );
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Class not found');
      }
    });

    it('should throw ForbiddenException if user is not member of the school (Without MemberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Not',
          lastName: 'Allowed',
          email: 'forbidden@getbyid.com',
          phone: '0933333333',
          photo: 'photo.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Blocked School',
            description: 'Forbidden test',
            phoneNumber: '0100000000',
            address: 'No Entry',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Chiang Mai',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_blocked01',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/1',
          level: 'ประถมศึกษาปีที่ 4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        await classroomService.getById({ classId: classroom.id }, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });

    it('should throw ForbiddenException if user is not member of the school (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Not',
          lastName: 'Allowed2',
          email: 'forbidden2@getbyid.com',
          phone: '0933333333',
          photo: 'photo.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Blocked School',
            description: 'Forbidden test',
            phoneNumber: '0100000000',
            address: 'No Entry',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Chiang Mai',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_blocked02',
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
          title: 'ป.4/1',
          level: 'ประถมศึกษาปีที่ 4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        await classroomService.getById({ classId: classroom.id }, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });
  });

  /////////////////////////////// get classroom by school id ////////////////////////////

  describe('getBySchool', () => {
    it('should return class list with student count and creator info', async () => {
      try {
        // Create user
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'One',
          email: 'teacher@getbyschool.com',
          phone: '0998888888',
          photo: 'teacher.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        // Create school
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            description: 'School for getBySchool test',
            phoneNumber: '0123456789',
            address: '123 Main St',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Bangkok',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_school_test',
          },
        });

        // Assign user to school
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

        // Create classroom
        const classroom = await classroomService.classRepository.create({
          title: 'มัธยมศึกษาปีที่ 5/1',
          level: 'มัธยมศึกษาปีที่ 5',
          description: 'ห้องเรียนหลัก',
          schoolId: school.id,
          userId: user.id,
        });

        // Add student to class
        const student = await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'ณัฐวุฒิ',
          lastName: 'ใจดี',
          photo: 'https://example.com/student.png',
          number: '01',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        // Execute function
        const result = await classroomService.getBySchool(
          {
            schoolId: school.id,
            isAchieved: false,
          },
          user,
        );

        // Expect one classroom
        const matched = result.find((r) => r.id === classroom.id);
        expect(matched).toBeDefined();
        expect(matched?.title).toBe(classroom.title);
        expect(matched?.studentNumbers).toBe(1);
        expect(matched?.creator?.id).toBe(user.id);
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if user is not member of the school (Without MemberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Out',
          lastName: 'Sider',
          email: 'outsider1@getbyschool.com',
          phone: '0887777777',
          photo: 'out.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Blocked School',
            description: 'User not member',
            phoneNumber: '0222222222',
            address: 'No Access',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Buriram',
            logo: 'blocked.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_blocked03',
          },
        });

        await classroomService.getBySchool(
          {
            schoolId: school.id,
            isAchieved: false,
          },
          user,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });

    it('should throw ForbiddenException if user is not member of the school (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Out',
          lastName: 'Sider',
          email: 'outsider2@getbyschool.com',
          phone: '0887777777',
          photo: 'out.png',
          password: 'password1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Blocked School',
            description: 'User not member',
            phoneNumber: '0222222222',
            address: 'No Access',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Buriram',
            logo: 'blocked.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_blocked04',
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

        await classroomService.getBySchool(
          {
            schoolId: school.id,
            isAchieved: false,
          },
          user,
        );

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });
  });

  /////////////////////////////// get classroom by school id ////////////////////////////

  describe('reorder', () => {
    it('should update class order and return reordered classes', async () => {
      try {
        // สร้างผู้ใช้
        const user = await userService.userRepository.createUser({
          firstName: 'Reorder',
          lastName: 'Test',
          email: 'reorder@class.com',
          phone: '0909090909',
          photo: 'profile.jpg',
          password: 'test1234',
          provider: 'LOCAL',
        });

        // สร้างโรงเรียน
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Reorder School',
            description: 'Test for reorder',
            phoneNumber: '0111111111',
            address: 'Test Address',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Udon Thani',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_reorder',
          },
        });

        // เพิ่มเป็นสมาชิกโรงเรียน
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

        // สร้าง class หลายตัว
        const class1 = await classroomService.classRepository.create({
          title: 'Class A',
          level: 'ป.1',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const class2 = await classroomService.classRepository.create({
          title: 'Class B',
          level: 'ป.2',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const class3 = await classroomService.classRepository.create({
          title: 'Class C',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        // เรียงลำดับใหม่ (C -> A -> B)
        const reordered = await classroomService.reorder(
          {
            classIds: [class3.id, class1.id, class2.id],
          },
          user,
        );

        // ตรวจสอบค่าที่คืน
        const updatedC = reordered.find((c) => c.id === class3.id);
        const updatedA = reordered.find((c) => c.id === class1.id);
        const updatedB = reordered.find((c) => c.id === class2.id);

        expect(updatedC?.order).toBe(1);
        expect(updatedA?.order).toBe(2);
        expect(updatedB?.order).toBe(3);
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if any class is missing', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Missing',
          lastName: 'Class',
          email: 'missing@class.com',
          phone: '0912345678',
          photo: 'photo.png',
          password: 'test123',
          provider: 'LOCAL',
        });

        await classroomService.reorder(
          {
            classIds: ['123456789012345678901234'],
          },
          user,
        );

        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Class not found');
      }
    });

    it('should throw ForbiddenException if user is not member of the school (Without MemberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'User',
          email: 'forbidden1@class.com',
          phone: '0922222222',
          photo: 'noaccess.png',
          password: '12345678',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            description: 'Forbidden',
            phoneNumber: '0222222222',
            address: 'Nowhere',
            zipCode: '99999',
            country: 'Thailand',
            city: 'Chiang Rai',
            logo: 'noaccess.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_noaccess01',
          },
        });

        const classA = await classroomService.classRepository.create({
          title: 'Class NoAccess',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        await classroomService.reorder(
          {
            classIds: [classA.id],
          },
          user,
        );

        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });

    it('should throw ForbiddenException if user is not member of the school (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Outsider',
          lastName: 'User',
          email: 'forbidden2@class.com',
          phone: '0922222222',
          photo: 'noaccess.png',
          password: '12345678',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            description: 'Forbidden',
            phoneNumber: '0222222222',
            address: 'Nowhere',
            zipCode: '99999',
            country: 'Thailand',
            city: 'Chiang Rai',
            logo: 'noaccess.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_noaccess02',
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

        const classA = await classroomService.classRepository.create({
          title: 'Class NoAccess',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        await classroomService.reorder(
          {
            classIds: [classA.id],
          },
          user,
        );

        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });
  });

  /////////////////////////////// update classroom ////////////////////////////

  describe('update', () => {
    it('should update the class if user has access', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Updater',
          lastName: 'Allowed',
          email: 'update1@class.com',
          phone: '0999999999',
          photo: 'photo.jpg',
          password: 'update123',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update School',
            description: 'School for update test',
            phoneNumber: '0100000000',
            address: 'Update Street',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Bangkok',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_update',
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
          blurHash: 'xyz',
        });

        const createdClass = await classroomService.classRepository.create({
          title: 'Original Title',
          level: 'ป.6',
          description: 'Before update',
          schoolId: school.id,
          userId: user.id,
        });

        const updated = await classroomService.update(
          {
            query: { classId: createdClass.id },
            body: {
              title: 'Updated Title',
              description: 'Updated description',
            },
          },
          user,
        );

        expect(updated.id).toBe(createdClass.id);
        expect(updated.title).toBe('Updated Title');
        expect(updated.description).toBe('Updated description');
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if class is not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'NoClass',
          lastName: 'Found',
          email: 'notfound@class.com',
          phone: '0911111111',
          photo: 'no-class.png',
          password: '12345678',
          provider: 'LOCAL',
        });

        await classroomService.update(
          {
            query: { classId: '123456789012345678901234' },
            body: { title: 'Should not update' },
          },
          user,
        );

        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Class not found');
      }
    });

    it('should throw ForbiddenException if user is not member of the school (Without MemberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Outside111',
          lastName: 'User',
          email: 'forbidden11@class.com',
          phone: '0922222222',
          photo: 'forbidden.png',
          password: '12345678',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Restricted School',
            description: 'Cannot edit class',
            phoneNumber: '0200000000',
            address: 'Restricted Street',
            zipCode: '99999',
            country: 'Thailand',
            city: 'Nakhon Pathom',
            logo: 'lock.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_restrict021',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Untouchable Class1',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: 'Do not touch',
        });

        await classroomService.update(
          {
            query: { classId: classroom.id },
            body: { title: 'Try to update' },
          },
          user,
        );

        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });

    it('should throw ForbiddenException if user is not member of the school (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Outside222',
          lastName: 'User',
          email: 'forbidden222@class.com',
          phone: '0932222222',
          photo: 'forbidden.png',
          password: '12345678',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Restricted School',
            description: 'Cannot edit class',
            phoneNumber: '0200000000',
            address: 'Restricted Street',
            zipCode: '99999',
            country: 'Thailand',
            city: 'Nakhon Pathom',
            logo: 'lock.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_restrict022',
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
          title: 'Untouchable Class2',
          level: 'ม.1',
          schoolId: school.id,
          userId: user.id,
          description: 'Do not touch',
        });

        await classroomService.update(
          {
            query: { classId: classroom.id },
            body: { title: 'Try to update' },
          },
          user,
        );

        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });
  });

  /////////////////////////////// delete classroom ////////////////////////////

  describe('delete', () => {
    it('should throw NotFoundException if class is not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Ghost',
          lastName: 'User',
          email: 'ghost@class.com',
          phone: '0944444444',
          photo: 'ghost.jpg',
          password: 'ghost123',
          provider: 'LOCAL',
        });

        await classroomService.delete(
          { classId: '012345678901234567890123' },
          user,
        );
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Class not found');
      }
    });

    it('should delete the class if user is ADMIN', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@class.com',
          phone: '0999999999',
          photo: 'admin.jpg',
          password: 'admin123',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            description: 'Delete test',
            phoneNumber: '0100000000',
            address: 'Delete Street',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Bangkok',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_delete',
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
          blurHash: 'xyz',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Class to Delete',
          level: 'ป.6',
          description: 'To be deleted',
          schoolId: school.id,
          userId: null,
        });

        const deleted = await classroomService.delete(
          { classId: classroom.id },
          user,
        );

        expect(deleted.id).toBe(classroom.id);
        expect(deleted.title).toBe('Class to Delete');
      } catch (error) {
        throw error;
      }
    });

    it('should delete the class if user is creator', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Creator',
          lastName: 'User',
          email: 'creator@class.com',
          phone: '0911111111',
          photo: 'creator.jpg',
          password: 'creator123',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Creator School',
            description: 'Test',
            phoneNumber: '0111111111',
            address: 'Street',
            zipCode: '10000',
            country: 'Thailand',
            city: 'Chiang Mai',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_creator',
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
          blurHash: 'abc',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Creator Class',
          level: 'ป.5',
          description: 'Creator made',
          schoolId: school.id,
          userId: user.id,
        });

        const deleted = await classroomService.delete(
          { classId: classroom.id },
          user,
        );

        expect(deleted.id).toBe(classroom.id);
        expect(deleted.title).toBe('Creator Class');
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if user is not admin and not the creator of the class', async () => {
      const creator = await userService.userRepository.createUser({
        firstName: 'Creator',
        lastName: 'User',
        email: 'creator@test.com',
        phone: '0890000000',
        photo: 'creator.jpg',
        password: '12345678',
        provider: 'LOCAL',
      });

      const outsider = await userService.userRepository.createUser({
        firstName: 'Intruder',
        lastName: 'User',
        email: 'intruder@test.com',
        phone: '0888888888',
        photo: 'intruder.jpg',
        password: '12345678',
        provider: 'LOCAL',
      });

      const school = await schoolService.schoolRepository.create({
        data: {
          title: 'Restricted Delete School',
          description: 'Test forbidden delete',
          phoneNumber: '0277777777',
          address: 'Secure St.',
          zipCode: '70000',
          country: 'Thailand',
          city: 'Pattaya',
          logo: 'secure.png',
          plan: 'FREE',
          billingManagerId: creator.id,
          stripe_customer_id: 'cus_secure01',
        },
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
        blurHash: 'zzz',
      });

      const classroom = await classroomService.classRepository.create({
        title: 'Creator Class',
        level: 'ม.1',
        description: 'Only owner can delete',
        schoolId: school.id,
        userId: creator.id,
      });

      try {
        await classroomService.delete({ classId: classroom.id }, outsider);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Only admin of this school and the creator of this classroom can delete',
        );
      }
    });

    it('should throw ForbiddenException if classroom has no creator and user is not admin', async () => {
      const user = await userService.userRepository.createUser({
        firstName: 'Basic',
        lastName: 'User',
        email: 'basicuser@test.com',
        phone: '0877777777',
        photo: 'basic.jpg',
        password: '12345678',
        provider: 'LOCAL',
      });

      const school = await schoolService.schoolRepository.create({
        data: {
          title: 'No Owner School',
          description: 'Test unowned class',
          phoneNumber: '0266666666',
          address: 'Ghost Road',
          zipCode: '60000',
          country: 'Thailand',
          city: 'Lampang',
          logo: 'ghost.png',
          plan: 'FREE',
          billingManagerId: user.id,
          stripe_customer_id: 'cus_noowner01',
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
        blurHash: 'abc123',
      });

      const classroom = await classroomService.classRepository.create({
        title: 'No Owner Class',
        level: 'ม.2',
        description: 'Only admin can delete this',
        schoolId: school.id,
        userId: null,
      });

      try {
        await classroomService.delete({ classId: classroom.id }, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Only admin of this school and the creator of this classroom can delete',
        );
      }
    });
  });

  /////////////////////////////// sendNotificationWhenClassDelete ////////////////////////////

  /////////////////////////////// getGradeSummaryReport ////////////////////////////
});
