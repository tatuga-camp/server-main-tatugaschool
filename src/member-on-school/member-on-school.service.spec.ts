import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MemberRole, Status, User } from '@prisma/client';
import { fail } from 'assert';
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
  CreateMemberOnSchoolDto,
  DeleteMemberOnSchoolDto,
  GetMemberOnSchoolByIdDto,
  GetMemberOnSchoolsDto,
  QueryMemberOnSchoolDto,
  UpdateMemberOnSchoolDto,
} from './dto';
import { AssignmentService } from '../assignment/assignment.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { StorageService } from '../storage/storage.service';
import { NotificationRepository } from '../notification/notification.repository';
import { NotificationService } from '../notification/notification.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

describe('MemberOnSchool Service', () => {
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
  const attendanceTableService = new AttendanceTableService(
    prismaService,
    teacherOnSubjectService,
    storageService,
  );

  let memberOnSchoolService: MemberOnSchoolService;
  let studentService: StudentService;
  let classroomService: ClassService;
  let gradeService: GradeService;
  let subjectService: SubjectService;
  let assignmentService: AssignmentService;
  let fileAssignmentService: FileAssignmentService;
  let attendanceStatusListService: AttendanceStatusListService;
  let subscriptionService: SubscriptionService;

  const schoolService = new SchoolService(
    prismaService,
    stripeService,
    memberOnSchoolService,
    storageService,
    subjectService,
    classroomService,
    subscriptionService,
    userService,
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
    storageService,
    classroomService,
  );

  classroomService = new ClassService(
    memberOnSchoolService,
    prismaService,
    emailService,
    pushService,
    storageService,
    userService,
    schoolService,
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

  const assignmentVideoQuizRepository = new AssignmentVideoQuizRepository(
    prismaService,
  );
  assignmentService = new AssignmentService(
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

  beforeEach(async () => {
    memberOnSchoolService = new MemberOnSchoolService(
      prismaService,
      emailService,
      pushService,
      schoolService,
    );
  });

  const mockUser = {
    id: '66500e4ea1b3f5370ac122f1',
    firstName: 'Petch',
    lastName: 'Service',
    email: 'petchservice@gmail.com',
    photo: 'https://example.com/photo.jpg',
    phone: '0891234567',
    blurHash: 'hash',
  } as User;

  const mockInviteUser = {
    id: '66500e4ea1b3f5370ac123a2',
    firstName: 'New',
    lastName: 'Teacher',
    email: 'teacher@example.com',
    photo: 'teacher.png',
    phone: '0899999999',
  } as User;

  /////////////////////////////// Validate Access ////////////////////////////

  describe('validateAccess', () => {
    it('should return member if user is accepted', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Mock School',
            description: 'Test school',
            phoneNumber: '0999999999',
            address: '123 Main Rd',
            zipCode: '10000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_001',
          },
        });

        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            schoolId: school.id,
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            phone: mockUser.phone,
            photo: mockUser.photo,
            blurHash: mockUser.blurHash,
            role: 'ADMIN',
            status: 'ACCEPT',
          });

        const result = await memberOnSchoolService.validateAccess({
          user: mockUser,
          schoolId: school.id,
        });

        expect(result).toBeDefined();
        expect(result.schoolId).toBe(school.id);
        expect(result.userId).toBe(mockUser.id);
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if not a member', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Mock School',
            description: 'Test school',
            phoneNumber: '0999999999',
            address: '123 Main Rd',
            zipCode: '10000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_002',
          },
        });

        await memberOnSchoolService.validateAccess({
          user: mockUser,
          schoolId: school.id,
        });

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });

    it('should throw ForbiddenException if status !== ACCEPT', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Mock School',
            description: 'Test school',
            phoneNumber: '0999999999',
            address: '123 Main Rd',
            zipCode: '10000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_003',
          },
        });

        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            schoolId: school.id,
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            phone: mockUser.phone,
            photo: mockUser.photo,
            blurHash: mockUser.blurHash,
            role: 'ADMIN',
            status: 'PENDDING',
          });

        await memberOnSchoolService.validateAccess({
          user: mockUser,
          schoolId: school.id,
        });
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });
  });

  /////////////////////////////// notifyMembers ////////////////////////////

  describe('notifyMembers', () => {
    it('should send notifications to all valid members', async () => {
      try {
        // 1. เตรียม user
        const createdUser = await userService.userRepository.createUser({
          firstName: 'Push',
          lastName: 'Tester',
          email: 'push@test.com',
          phone: '0899999999',
          photo: 'push.jpg',
          password: 'password123',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Push Test School',
            description: 'School for push test',
            phoneNumber: '0888888888',
            address: '123 Push Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'push-logo.png',
            plan: 'FREE',
            billingManagerId: createdUser.id,
            stripe_customer_id: 'cus_push_001',
          },
        });

        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: createdUser.id,
            schoolId: school.id,
            role: 'TEACHER',
            status: 'ACCEPT',
            email: createdUser.email,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            phone: createdUser.phone,
            photo: createdUser.photo,
            blurHash: 'hash',
          });

        const mockPush = {
          id: '66500e4ea1b3f5370ac122f9',
          endpoint: 'https://example.com/fake-token',
          data: {
            keys: {
              p256dh: 'mockP256dh',
              auth: 'mockAuth',
            },
          },
          userAgent: 'TestAgent/1.0',
          expiredAt: new Date(Date.now() + 86400000),
          userId: null,
          createAt: new Date(),
          updateAt: new Date(),
        };

        // 2. เพิ่ม push subscription
        jest
          .spyOn(pushService.pushRepository, 'create')
          .mockResolvedValueOnce(mockPush as any);

        const created = await pushService.pushRepository.create({
          data: {
            endpoint: mockPush.endpoint,
            data: mockPush.data,
            userAgent: mockPush.userAgent,
            expiredAt: mockPush.expiredAt,
            user: undefined as any,
          },
        } as any);

        expect(created).toBeDefined();
        expect(created.id).toBe(mockPush.id);
        expect(created.endpoint).toBe(mockPush.endpoint);

        // 3. เรียก notifyMembers แบบใช้ (memberOnSchoolService as any)
        await (memberOnSchoolService as any).notifyMembers({
          schoolId: school.id,
          title: 'Test Notify Title',
          body: 'This is a test push notification',
          url: new URL('https://tatuga.school/account'),
          members: [member],
        });

        // ถ้าไม่ throw แสดงว่าผ่าน
        expect(true).toBe(true);
      } catch (error) {
        throw error;
      }
    });

    it('should throw if pushService or user lookup fails', async () => {
      try {
        const brokenMember = {
          userId: '0123456789012345678901234',
        } as any;

        await (memberOnSchoolService as any).notifyMembers({
          schoolId: '0123456789012345678901234',
          title: 'Fail',
          body: 'Should fail',
          url: new URL('https://tatuga.fail'),
          members: [brokenMember],
        });

        fail('Expected error but none thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined(); // ข้อความอาจต่างกันตามกรณีจริง
      }
    });
  });

  /////////////////////////////// getMemberOnSchoolByUserId ////////////////////////////

  describe('getMemberOnSchoolByUserId', () => {
    it('should return accepted memberOnSchool with correct school info', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'School for getMember',
            description: 'Get member test',
            phoneNumber: '0899999999',
            address: '1 Get Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'KKU',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_get_member',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          blurHash: mockUser.blurHash,
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const result =
          await memberOnSchoolService.getMemberOnSchoolByUserId(mockUser);

        const found = result.find((m) => m.school.id === school.id);

        expect(found).toBeDefined();
        expect(found.school.title).toBe('School for getMember');
        expect(found.schoolId).toBe(school.id);
        expect(found.userId).toBe(mockUser.id);
      } catch (error) {
        throw error;
      }
    });

    it('should return empty array if user is not a member of any school', async () => {
      try {
        const result =
          await memberOnSchoolService.getMemberOnSchoolByUserId(mockInviteUser);
        expect(Array.isArray(result)).toBe(true);
        expect(
          result.find((m) => m.userId === mockInviteUser.id),
        ).toBeUndefined();
        expect(result.length).toBe(0);
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// getSchoolByMemberOnSchoolById ////////////////////////////

  describe('getSchoolByMemberOnSchoolById', () => {
    it('should return memberOnSchool if user has access and member exists', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Get By ID School',
            description: 'Test for get by ID',
            phoneNumber: '0999999999',
            address: '123 Access Rd',
            zipCode: '10000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_get_by_id',
          },
        });

        const created =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            schoolId: school.id,
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            phone: mockUser.phone,
            photo: mockUser.photo,
            blurHash: mockUser.blurHash,
            role: 'TEACHER',
            status: 'ACCEPT',
          });

        const dto: GetMemberOnSchoolByIdDto = {
          memberOnSchoolId: created.id,
        };

        const result =
          await memberOnSchoolService.getSchoolByMemberOnSchoolById(
            dto,
            mockUser,
          );

        expect(result).toBeDefined();
        expect(result.id).toBe(created.id);
        expect(result.schoolId).toBe(school.id);
        expect(result.userId).toBe(mockUser.id);
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if member not found', async () => {
      const fakeId = '123456789012345678901234';
      try {
        const dto: GetMemberOnSchoolByIdDto = {
          memberOnSchoolId: fakeId,
        };
        await memberOnSchoolService.getSchoolByMemberOnSchoolById(
          dto,
          mockUser,
        );
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain(
          `MemberOnSchool with ID ${fakeId} not found`,
        );
      }
    });

    it('should throw ForbiddenException if user is not a member of the school', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            description: 'Should not access',
            phoneNumber: '0888888888',
            address: '111 No Way',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_no_access',
          },
        });

        const otherMember =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            schoolId: school.id,
            userId: mockInviteUser.id,
            email: mockInviteUser.email,
            firstName: mockInviteUser.firstName,
            lastName: mockInviteUser.lastName,
            phone: mockInviteUser.phone,
            photo: mockInviteUser.photo,
            role: 'TEACHER',
            status: 'ACCEPT',
          });

        const dto: GetMemberOnSchoolByIdDto = {
          memberOnSchoolId: otherMember.id,
        };

        await memberOnSchoolService.getSchoolByMemberOnSchoolById(
          dto,
          mockUser,
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

  /////////////////////////////// getAllMemberOnSchools ////////////////////////////

  describe('getAllMemberOnSchools', () => {
    it('should return all members of the given school if user is admin', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'All Member School',
            description: 'Test get all members',
            phoneNumber: '0888888888',
            address: '22 Admin Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_all_member_01',
          },
        });

        const admin =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            schoolId: school.id,
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            phone: mockUser.phone,
            photo: mockUser.photo,
            blurHash: mockUser.blurHash,
            role: 'ADMIN',
            status: 'ACCEPT',
          });

        const anotherMember =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            schoolId: school.id,
            userId: mockInviteUser.id,
            email: mockInviteUser.email,
            firstName: mockInviteUser.firstName,
            lastName: mockInviteUser.lastName,
            phone: mockInviteUser.phone,
            photo: mockInviteUser.photo,
            blurHash: 'abc123',
            role: 'TEACHER',
            status: 'ACCEPT',
          });

        const dto: GetMemberOnSchoolsDto & QueryMemberOnSchoolDto = {
          schoolId: school.id,
          email: mockUser.email,
        };

        const result = await memberOnSchoolService.getAllMemberOnSchools(
          dto,
          mockUser,
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.find((m) => m.userId === mockUser.id)).toBeDefined();
        expect(
          result.find((m) => m.userId === mockInviteUser.id),
        ).toBeDefined();
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if user is not a member of the school', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Unauthorized School',
            description: 'Forbidden test',
            phoneNumber: '0999999999',
            address: '9 Forbidden Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'KKU',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_all_member_02',
          },
        });

        const dto: GetMemberOnSchoolsDto & QueryMemberOnSchoolDto = {
          schoolId: school.id,
          email: mockUser.email,
        };

        await memberOnSchoolService.getAllMemberOnSchools(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          'Access denied: User is not a member of the school',
        );
      }
    });
  });

  /////////////////////////////// createMemberOnSchool ////////////////////////////

  describe('createMemberOnSchool', () => {
    it('should create member successfully if user is admin', async () => {
      try {
        const createdUser = await userService.userRepository.createUser({
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          email: mockUser.email,
          phone: mockUser.phone,
          photo: mockUser.photo,
          password: 'mockpassword',
          provider: 'LOCAL',
        });

        const createdInviteUser = await userService.userRepository.createUser({
          firstName: mockInviteUser.firstName,
          lastName: mockInviteUser.lastName,
          email: mockInviteUser.email,
          phone: mockInviteUser.phone,
          photo: mockInviteUser.photo,
          password: 'mockpassword',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Create School',
            description: 'Create member test',
            phoneNumber: '0888888888',
            address: '123 Create Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: createdUser.id,
            stripe_customer_id: 'cus_create01',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: createdUser.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          phone: createdUser.phone,
          photo: createdUser.photo,
          blurHash: createdUser.blurHash,
        });

        const dto: CreateMemberOnSchoolDto = {
          email: createdInviteUser.email,
          role: 'TEACHER',
          schoolId: school.id,
        };

        const result = await memberOnSchoolService.createMemberOnSchool(
          dto,
          createdUser,
        );

        expect(result).toBeDefined();
        expect(result.userId).toBe(createdInviteUser.id);
        expect(result.schoolId).toBe(school.id);
        expect(result.email).toBe(createdInviteUser.email);
        expect(result.firstName).toBe(createdInviteUser.firstName);
        expect(result.lastName).toBe(createdInviteUser.lastName);
        expect(result.phone).toBe(createdInviteUser.phone);
        expect(result.photo).toBe(createdInviteUser.photo);
        expect(result.role).toBe(dto.role);
        expect(result.status).toBe('PENDDING');
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if empty school', async () => {
      try {
        const createdUser = await userService.userRepository.findByEmail({
          email: mockUser.email,
        });

        const dto: CreateMemberOnSchoolDto = {
          email: createdUser.email,
          role: 'ADMIN',
          schoolId: '123456789012345678901234',
        };

        await memberOnSchoolService.createMemberOnSchool(dto, createdUser);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('No School Found with this schoolId');
      }
    });

    it('should throw NotFoundException if user not found by email', async () => {
      try {
        const createdUser = await userService.userRepository.findByEmail({
          email: mockUser.email,
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No User School',
            description: 'No user case',
            phoneNumber: '0888888888',
            address: '123 NoUser Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: createdUser.id,
            stripe_customer_id: 'cus_create02',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: createdUser.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          phone: createdUser.phone,
          photo: createdUser.photo,
          blurHash: createdUser.blurHash,
        });

        const dto: CreateMemberOnSchoolDto = {
          email: 'notfound@gmail.com',
          role: 'TEACHER',
          schoolId: school.id,
        };

        await memberOnSchoolService.createMemberOnSchool(dto, createdUser);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('No user found with this email');
      }
    });

    it('should throw ForbiddenException if member already exists', async () => {
      try {
        const createdUser = await userService.userRepository.findByEmail({
          email: mockUser.email,
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Duplicate Member School',
            description: 'Member exists case',
            phoneNumber: '0888888888',
            address: '123 Duplicate Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: createdUser.id,
            stripe_customer_id: 'cus_create03',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: createdUser.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          phone: createdUser.phone,
          photo: createdUser.photo,
          blurHash: createdUser.blurHash,
        });

        const dto: CreateMemberOnSchoolDto = {
          email: createdUser.email,
          role: 'TEACHER',
          schoolId: school.id,
        };

        await memberOnSchoolService.createMemberOnSchool(dto, createdUser);

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: createdUser.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'PENDDING',
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          phone: createdUser.phone,
          photo: createdUser.photo,
          blurHash: createdUser.blurHash,
        });
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('MemberOnSchool already exists');
      }
    });

    it('should throw ForbiddenException if user is not admin and trying to invite ADMIN', async () => {
      try {
        const createdUser = await userService.userRepository.findByEmail({
          email: mockUser.email,
        });

        const createdInviteUser = await userService.userRepository.findByEmail({
          email: mockInviteUser.email,
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Role Restriction School',
            description: 'Role test',
            phoneNumber: '0888888888',
            address: '123 Role Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: createdUser.id,
            stripe_customer_id: 'cus_create04',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: createdUser.id,
          schoolId: school.id,
          role: 'TEACHER', // Not admin
          status: 'ACCEPT',
          email: createdUser.email,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          phone: createdUser.phone,
          photo: createdUser.photo,
          blurHash: createdUser.blurHash,
        });

        const dto: CreateMemberOnSchoolDto = {
          email: createdInviteUser.email,
          role: 'ADMIN', // Trying to invite ADMIN
          schoolId: school.id,
        };

        await memberOnSchoolService.createMemberOnSchool(dto, createdUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          "You don't have permission to invite other user as a admin",
        );
      }
    });
  });

  /////////////////////////////// updateMemberOnSchool ////////////////////////////

  describe('updateMemberOnSchool', () => {
    it('should update member role successfully if user is admin', async () => {
      try {
        // สร้างผู้ใช้
        const adminUser = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin-update@example.com',
          phone: '0810000000',
          photo: 'admin.png',
          password: 'secure',
          provider: 'LOCAL',
        });

        const invitee = await userService.userRepository.createUser({
          firstName: 'Invitee',
          lastName: 'User',
          email: 'invitee-update@example.com',
          phone: '0820000000',
          photo: 'invitee.png',
          password: 'secure',
          provider: 'LOCAL',
        });

        // สร้างโรงเรียน
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Update School',
            description: 'For update test',
            phoneNumber: '0999999999',
            address: 'Update Rd',
            zipCode: '30000',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: adminUser.id,
            stripe_customer_id: 'cus_update_01',
          },
        });

        // เพิ่ม admin เป็นสมาชิก
        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: adminUser.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          phone: adminUser.phone,
          photo: adminUser.photo,
          blurHash: 'adminhash',
        });

        // เพิ่ม invitee เป็นสมาชิก
        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: invitee.id,
            schoolId: school.id,
            role: 'ADMIN',
            status: 'ACCEPT',
            email: invitee.email,
            firstName: invitee.firstName,
            lastName: invitee.lastName,
            phone: invitee.phone,
            photo: invitee.photo,
            blurHash: 'inviteehash',
          });

        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: member.id,
          },
          body: {
            role: 'TEACHER',
          },
        };

        const result = await memberOnSchoolService.updateMemberOnSchool(
          dto,
          adminUser,
        );

        expect(result).toBeDefined();
        expect(result.id).toBe(member.id);
        expect(result.email).toBe(member.email);
        expect(result.firstName).toBe(member.firstName);
        expect(result.lastName).toBe(member.lastName);
        expect(result.phone).toBe(member.phone);
        expect(result.photo).toBe(member.photo);
        expect(result.schoolId).toBe(member.schoolId);
        expect(result.status).toBe(member.status);
        expect(result.role).toBe(dto.body.role);
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if member not found', async () => {
      const fakeId = '6123456789abcdef01234567';
      try {
        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: fakeId,
          },
          body: {
            role: 'TEACHER',
          },
        };

        const adminUser = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin-notfound@example.com',
          phone: '0810000000',
          photo: 'admin.png',
          password: 'secure',
          provider: 'LOCAL',
        });

        await memberOnSchoolService.updateMemberOnSchool(dto, adminUser);

        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain(
          `MemberOnSchool with ID ${fakeId} not found`,
        );
      }
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'NonAdmin',
          lastName: 'User',
          email: 'nonadmin@example.com',
          phone: '0812222222',
          photo: 'nonadmin.png',
          password: 'secure',
          provider: 'LOCAL',
        });

        const invitee = await userService.userRepository.createUser({
          firstName: 'Invitee',
          lastName: 'Test',
          email: 'invitee-noadmin@example.com',
          phone: '0830000000',
          photo: 'invitee.png',
          password: 'secure',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NonAdmin School',
            description: 'For forbidden test',
            phoneNumber: '0900000000',
            address: 'NoAdmin Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'KK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_update02',
          },
        });

        // เพิ่ม user เป็น TEACHER
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
          blurHash: 'nonadminhash',
        });

        // เพิ่ม invitee
        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: invitee.id,
            schoolId: school.id,
            role: 'TEACHER',
            status: 'ACCEPT',
            email: invitee.email,
            firstName: invitee.firstName,
            lastName: invitee.lastName,
            phone: invitee.phone,
            photo: invitee.photo,
            blurHash: 'inviteehash',
          });

        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: member.id,
          },
          body: {
            role: 'TEACHER',
          },
        };

        await memberOnSchoolService.updateMemberOnSchool(dto, user);

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('คุณไม่มีสิทธิ์ใช้งานนี้');
      }
    });
  });

  /////////////////////////////// AcceptMemberOnSchool ////////////////////////////

  describe('AcceptMemberOnSchool', () => {
    it('should accept invitation and notify others', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Accept',
          lastName: 'User',
          email: 'acceptuser@example.com',
          phone: '0810000000',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Accept School',
            description: 'Invite test',
            phoneNumber: '0111111111',
            address: '999 Accept Rd',
            zipCode: '20000',
            country: 'Thailand',
            city: 'CNX',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_accept01',
          },
        });

        const member =
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
            blurHash: 'hash',
          });

        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: member.id,
          },
          body: {
            status: Status.ACCEPT,
            role: MemberRole.TEACHER,
          },
        };

        const result = await memberOnSchoolService.AcceptMemberOnSchool(
          dto,
          user,
        );

        expect(result.message).toBe('Accept success');
      } catch (error) {
        throw error;
      }
    });

    it('should reject invitation and notify others', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Reject',
          lastName: 'User',
          email: 'reject@example.com',
          phone: '0810000000',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Reject School',
            description: 'Reject test',
            phoneNumber: '0111112222',
            address: '999 Reject Rd',
            zipCode: '20001',
            country: 'Thailand',
            city: 'BKK',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_accept02',
          },
        });

        const member =
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
            blurHash: 'hash',
          });

        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: member.id,
          },
          body: {
            status: Status.REJECT,
            role: MemberRole.TEACHER,
          },
        };

        const result = await memberOnSchoolService.AcceptMemberOnSchool(
          dto,
          user,
        );

        expect(result.message).toBe('Reject success');
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if user is not the invited member', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'User',
          lastName: 'Main',
          email: 'Usermain@example.com',
          phone: '0888888888',
          photo: 'user.png',
          provider: 'LOCAL',
          password: 'mock',
        });

        const otherUser = await userService.userRepository.createUser({
          firstName: 'User',
          lastName: 'Other',
          email: 'userother@example.com',
          phone: '0830000000',
          photo: 'user.png',
          password: 'secure',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden Accept',
            description: 'Invalid accept',
            phoneNumber: '0999999999',
            address: '888 Wrong Rd',
            zipCode: '12345',
            country: 'Thailand',
            city: 'KKU',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_accept03',
          },
        });

        const member =
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

        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: member.id,
          },
          body: {
            status: Status.ACCEPT,
            role: MemberRole.TEACHER,
          },
        };

        await memberOnSchoolService.AcceptMemberOnSchool(dto, otherUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe(
          "You don't have permission to accept this invitation",
        );
      }
    });

    it('should throw NotFoundException if member does not exist', async () => {
      try {
        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: '012345678901234567890123',
          },
          body: {
            status: Status.ACCEPT,
            role: MemberRole.TEACHER,
          },
        };

        await memberOnSchoolService.AcceptMemberOnSchool(dto, mockUser);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Not found member on school');
      }
    });

    it('should throw BadRequestException if status is invalid', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Badstatus',
          lastName: 'User',
          email: 'badstatus@example.com',
          phone: '0810000000',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Bad Status School',
            description: 'Test invalid status',
            phoneNumber: '0123456789',
            address: '777 Status Rd',
            zipCode: '60000',
            country: 'Thailand',
            city: 'NS',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_accept04',
          },
        });

        const member =
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
            blurHash: 'hash',
          });

        const dto: UpdateMemberOnSchoolDto = {
          query: {
            memberOnSchoolId: member.id,
          },
          body: {
            status: 'INVALID' as any,
            role: MemberRole.TEACHER,
          },
        };

        await memberOnSchoolService.AcceptMemberOnSchool(dto, user);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe('Invalid status');
      }
    });
  });

  /////////////////////////////// deleteMemberOnSchool ////////////////////////////

  describe('deleteMemberOnSchool', () => {
    it('should delete member if user is admin and not last admin', async () => {
      try {
        const adminUser = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Delete',
          email: 'admin+delete1@example.com',
          phone: '0813200000',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            description: 'Delete test',
            phoneNumber: '0111111111',
            address: '999 Delete Rd',
            zipCode: '20000',
            country: 'Thailand',
            city: 'CNX',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: adminUser.id,
            stripe_customer_id: 'cus_delete01',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: adminUser.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          phone: adminUser.phone,
          photo: adminUser.photo,
          blurHash: adminUser.blurHash,
        });

        const targetUser = await userService.userRepository.createUser({
          firstName: 'Target',
          lastName: 'User',
          email: 'target+delete@example.com',
          phone: '0812344321',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const targetMember =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: targetUser.id,
            schoolId: school.id,
            role: 'TEACHER',
            status: 'ACCEPT',
            email: targetUser.email,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            phone: targetUser.phone,
            photo: targetUser.photo,
            blurHash: targetUser.blurHash,
          });

        const dto: DeleteMemberOnSchoolDto = {
          memberOnSchoolId: targetMember.id,
        };

        const result = await memberOnSchoolService.deleteMemberOnSchool(
          dto,
          adminUser,
        );

        expect(result).toBeDefined();
        expect(result.userId).toBe(targetUser.id);
        expect(result.schoolId).toBe(school.id);
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if member does not exist', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Delete',
          email: 'admin+delete2@example.com',
          phone: '0813200000',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const dto: DeleteMemberOnSchoolDto = {
          memberOnSchoolId: '012345678901234567890123',
        };

        await memberOnSchoolService.deleteMemberOnSchool(dto, user);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Not found member on school');
      }
    });

    it('should throw ForbiddenException if user is not admin and not self', async () => {
      try {
        const userA = await userService.userRepository.createUser({
          firstName: 'UserA',
          lastName: 'NotAdmin',
          email: 'a+notadmin@example.com',
          phone: '0813200001',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const userB = await userService.userRepository.createUser({
          firstName: 'UserB',
          lastName: 'NotAdmin',
          email: 'b+notadmin@example.com',
          phone: '0813200021',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Admin Delete',
            description: 'No admin delete test',
            phoneNumber: '0888888888',
            address: '456 Reject Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'CM',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: userA.id,
            stripe_customer_id: 'cus_delete02',
          },
        });

        const memberA =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: userA.id,
            schoolId: school.id,
            role: 'TEACHER',
            status: 'ACCEPT',
            email: userA.email,
            firstName: userA.firstName,
            lastName: userA.lastName,
            phone: userA.phone,
            photo: userA.photo,
            blurHash: userA.blurHash,
          });

        const memberB =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: userB.id,
            schoolId: school.id,
            role: 'TEACHER',
            status: 'ACCEPT',
            email: userB.email,
            firstName: userB.firstName,
            lastName: userB.lastName,
            phone: userB.phone,
            photo: userB.photo,
            blurHash: userB.blurHash,
          });

        const dto: DeleteMemberOnSchoolDto = {
          memberOnSchoolId: memberB.id,
        };

        await memberOnSchoolService.deleteMemberOnSchool(dto, userA);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You don't have permission to delete");
      }
    });

    it('should throw BadRequestException if trying to delete last admin', async () => {
      try {
        const adminUser = await userService.userRepository.createUser({
          firstName: 'Last',
          lastName: 'Admin',
          email: 'lastadmin@example.com',
          phone: '0813200024',
          photo: 'User.png',
          password: 'securepassword1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Last Admin',
            description: 'Only admin test',
            phoneNumber: '0877777777',
            address: '123 Admin Rd',
            zipCode: '30000',
            country: 'Thailand',
            city: 'NY',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: adminUser.id,
            stripe_customer_id: 'cus_delete03',
          },
        });

        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: adminUser.id,
            schoolId: school.id,
            role: 'ADMIN',
            status: 'ACCEPT',
            email: adminUser.email,
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            phone: adminUser.phone,
            photo: adminUser.photo,
            blurHash: adminUser.blurHash,
          });

        const dto: DeleteMemberOnSchoolDto = {
          memberOnSchoolId: member.id,
        };

        await memberOnSchoolService.deleteMemberOnSchool(dto, adminUser);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          "You are the last admin in this school you can't delete yourself",
        );
      }
    });

    it('should allow user to delete themselves if not admin', async () => {
      try {
        const selfUser = await userService.userRepository.createUser({
          firstName: 'Self',
          lastName: 'Delete',
          email: 'self@delete.com',
          phone: '0890000099',
          photo: 'self.png',
          password: '12345678',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Last Admin',
            description: 'Only admin test',
            phoneNumber: '0877777777',
            address: '123 Admin Rd',
            zipCode: '30000',
            country: 'Thailand',
            city: 'NY',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: selfUser.id,
            stripe_customer_id: 'cus_delete04',
          },
        });

        const member =
          await memberOnSchoolService.memberOnSchoolRepository.create({
            userId: selfUser.id,
            schoolId: school.id,
            role: 'TEACHER',
            status: 'ACCEPT',
            email: selfUser.email,
            firstName: selfUser.firstName,
            lastName: selfUser.lastName,
            phone: selfUser.phone,
            photo: selfUser.photo,
            blurHash: selfUser.blurHash,
          });

        const dto: DeleteMemberOnSchoolDto = {
          memberOnSchoolId: member.id,
        };

        const result = await memberOnSchoolService.deleteMemberOnSchool(
          dto,
          selfUser,
        );

        expect(result).toBeDefined();
        expect(result.userId).toBe(selfUser.id);
      } catch (error) {
        throw error;
      }
    });
  });
});
