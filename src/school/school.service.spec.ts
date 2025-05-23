import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  Assignment,
  PrismaClient,
  Skill,
  SkillOnAssignment,
  User,
  School,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
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
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import {
  CreateSchoolDto,
  DeleteSchoolDto,
  GetSchoolByIdDto,
  UpdateSchoolDto,
} from './dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { Subject } from 'rxjs';
import { fail } from 'assert';
import { StudentOnAssignmentService } from '../student-on-assignment/student-on-assignment.service';
import { error } from 'console';

describe('School Service', () => {
  let schoolService: SchoolService;
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

  const skillOnStudentAssignmentService = new SkillOnStudentAssignmentService(
    prismaService,
    memberOnSchoolService,
    googleStorageService,
  );

  const studentOnAssignmentService = new StudentOnAssignmentService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
    pushService,
    skillOnStudentAssignmentService,
  );

  beforeEach(async () => {
    schoolService = new SchoolService(
      prismaService,
      stripeService,
      memberOnSchoolService,
      googleStorageService,
      studentService,
      subjectService,
      classroomService,
    );
  });

  const mockUser = {
    id: '66500e4ea1b3f5370ac123f0',
    firstName: 'Petch',
    lastName: 'School Service',
    email: 'petchschoolservice@gmail.com',
    photo: 'https://example.com/photo.jpg',
    phone: '0899999999',
  } as User;

  const mockUser1 = {
    id: '66500e4ea1b3f5370ac123f1',
    firstName: 'Petch 1',
    lastName: 'School Service 1',
    email: 'petchschoolservice1@gmail.com',
    photo: 'https://example.com/photo.jpg',
    phone: '0899999998',
  } as User;

  const mockUser2 = {
    id: '66500e4ea1b3f5370ac123f2',
    firstName: 'Petch 2',
    lastName: 'School Service 1',
    email: 'petchschoolservice1@gmail.com',
    photo: 'https://example.com/photo.jpg',
    phone: '0899999997',
  } as User;
  /////////////////////////////// Create School ////////////////////////////

  describe('createSchool', () => {
    it('should create school and add user as ADMIN member', async () => {
      try {
        const dto: CreateSchoolDto = {
          title: 'โรงเรียนทดสอบ',
          description: 'รายละเอียดโรงเรียนทดสอบ',
          country: 'Thailand',
          city: 'Khon Kaen',
          address: '123 ถนนหลัก ตำบลในเมือง อำเภอเมือง',
          zipCode: '40000',
          logo: 'https://example.com/logo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          phoneNumber: '0891234567',
        };

        const created = await schoolService.createSchool(dto, mockUser);

        expect(created).toBeDefined();
        expect(created.title).toBe(dto.title);
        expect(created.description).toBe(dto.description);
        expect(created.country).toBe(dto.country);
        expect(created.city).toBe(dto.city);
        expect(created.address).toBe(dto.address);
        expect(created.zipCode).toBe(dto.zipCode);
        expect(created.logo).toBe(dto.logo);
        expect(created.blurHash).toBe(dto.blurHash);
        expect(created.phoneNumber).toBe(dto.phoneNumber);
        expect(created.plan).toBe('FREE');
        expect(created.billingManagerId).toBe(mockUser.id);

        const foundMember =
          await memberOnSchoolService.memberOnSchoolRepository.findFirst({
            where: {
              email: mockUser.email,
            },
          });

        expect(foundMember).toBeDefined();
        expect(foundMember.role).toBe('ADMIN');
        expect(foundMember.status).toBe('ACCEPT');
        expect(foundMember.schoolId).toBe(created.id);
      } catch (error) {
        throw error;
      }
    });
  });
  /////////////////////////////// Get Schools ////////////////////////////
  describe('getSchools', () => {
    it('should return all schools that user is a member with status ACCEPT', async () => {
      try {
        // สร้างโรงเรียน 2 แห่ง
        const school1 = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียน A',
            description: 'A',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Test',
            zipCode: '10000',
            logo: 'logo-a.png',
            phoneNumber: '0891111111',
            plan: 'FREE',
            billingManagerId: mockUser1.id,
            stripe_customer_id: 'cus_test1',
          },
        });

        const school2 = await schoolService.schoolRepository.create({
          data: {
            title: 'โรงเรียน B',
            description: 'B',
            country: 'Thailand',
            city: 'Chiang Mai',
            address: '456 Sample',
            zipCode: '50000',
            logo: 'logo-b.png',
            phoneNumber: '0892222222',
            plan: 'FREE',
            billingManagerId: mockUser1.id,
            stripe_customer_id: 'cus_test2',
          },
        });

        // เพิ่ม mockUser เป็นสมาชิกโรงเรียนทั้งสอง
        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser1.id,
          email: mockUser1.email,
          firstName: mockUser1.firstName,
          lastName: mockUser1.lastName,
          phone: mockUser1.phone,
          photo: mockUser1.photo,
          schoolId: school1.id,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser1.id,
          email: mockUser1.email,
          firstName: mockUser1.firstName,
          lastName: mockUser1.lastName,
          phone: mockUser1.phone,
          photo: mockUser1.photo,
          schoolId: school2.id,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        // ทดสอบฟังก์ชัน
        const result = await schoolService.getSchools(mockUser1);

        expect(result).toBeDefined();
        expect(result.length).toBe(2);
        const ids = result.map((s) => s.id);
        expect(ids).toContain(school1.id);
        expect(ids).toContain(school2.id);
      } catch (error) {
        throw error;
      }
    });

    it('should return empty array if user is not a member of any school', async () => {
      try {
        const fakeUser = {
          id: '112233445566778899001234',
          firstName: 'fakeUser',
          lastName: 'School Service',
          email: 'fakeuserschoolservice@gmail.com',
          photo: 'https://example.com/photo.jpg',
          phone: '0891112222',
        } as User;

        const result = await schoolService.getSchools(fakeUser);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Get School By ID ////////////////////////////

  describe('getSchoolById', () => {
    it('should return full school details if user has access', async () => {
      try {
        // สร้างผู้ใช้ให้มีใน database ก่อน
        const user = await userService.userRepository.createUser({
          firstName: 'Jonathan',
          lastName: 'Wick',
          email: 'JohnWick@gmail.com',
          phone: '0812345678',
          password: 'secret_password123',
          provider: 'LOCAL',
          role: 'USER',
          photo:
            'https://storage.googleapis.com/public-tatugaschool/avatars/15.png',
        });

        // สร้างโรงเรียน
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            description: 'Test Desc',
            country: 'Thailand',
            city: 'Bangkok',
            address: '1 Test Road',
            zipCode: '10000',
            logo: 'test-logo.png',
            phoneNumber: '0812345678',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_mock',
          },
        });

        // เพิ่มสมาชิก
        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        const dto = { schoolId: school.id };

        const result = await schoolService.getSchoolById(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBe(school.id);
        expect(result.totalClass).toBeGreaterThanOrEqual(0);
        expect(result.totalSubject).toBeGreaterThanOrEqual(0);
        expect(result.totalTeacher).toBeGreaterThanOrEqual(1);
        expect(result.user).toBeDefined();
        expect(result.user.id).toBe(user.id);
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if school does not exist', async () => {
      try {
        const dto = {
          schoolId: '66500e4ea1b3f5370ac12399', // สมมุติ id ที่ไม่มีอยู่จริง
        };

        await schoolService.getSchoolById(dto, mockUser);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('School not found or It has been deleted');
      }
    });

    it('should throw ForbiddenException if user has no access', async () => {
      try {
        // สร้างโรงเรียน
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Private School',
            description: 'No Access',
            country: 'Thailand',
            city: 'KKU',
            address: 'Secret Lane',
            zipCode: '40000',
            logo: 'private.png',
            phoneNumber: '0823456789',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_none',
            plan: 'FREE',
          },
        });

        const dto = { schoolId: school.id };

        const fakeUser = {
          id: '112233445566778899001235',
          firstName: 'fakeUser',
          lastName: 'School Service',
          email: 'fakeuserschoolservice@gmail.com',
          photo: 'https://example.com/photo.jpg',
          phone: '0891112225',
        } as User;

        await schoolService.getSchoolById(dto, fakeUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should downgrade to FREE plan if Stripe subscription is not active', async () => {
      try {
        // สร้างโรงเรียนพร้อม Stripe subscription id
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Stripe School',
            description: 'Stripe Integration',
            country: 'Thailand',
            city: 'CNX',
            address: 'Stripe Rd',
            zipCode: '50000',
            logo: 'stripe.png',
            phoneNumber: '0834567890',
            plan: 'PREMIUM',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_stripe',
            stripe_subscription_id: 'sub_inactive',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        // Mock Stripe subscription เป็น inactive
        jest
          .spyOn(stripeService.subscriptions, 'retrieve')
          .mockResolvedValue({ id: 'sub_inactive', status: 'canceled' } as any);

        const result = await schoolService.getSchoolById(
          { schoolId: school.id },
          mockUser,
        );

        expect(result.plan).toBe('FREE'); // ถูก downgrade แล้ว
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Validate Limit ////////////////////////////

  describe('ValidateLimit', () => {
    const baseSchool: School = {
      id: 'school123',
      title: 'Test School',
      description: 'Desc',
      address: '123',
      zipCode: '40000',
      logo: 'logo.png',
      blurHash: 'blur',
      phoneNumber: '0999999999',
      country: 'Thailand',
      city: 'Bangkok',
      plan: 'FREE',
      stripe_customer_id: 'cus_abc',
      billingManagerId: 'user123',
      limitTotalStorage: 100,
      limitClassNumber: 10,
      limitSchoolMember: 5,
      limitSubjectNumber: 7,
      stripe_subscription_expireAt: null,
      stripe_price_id: null,
      stripe_subscription_id: null,
      createAt: new Date(),
      updateAt: new Date(),
      isDeleted: false,
      totalStorage: 0,
    };

    it('should not throw if all values are within limit', async () => {
      try {
        await expect(
          schoolService.ValidateLimit(baseSchool, 'members', 3),
        ).resolves.not.toThrow();
        await expect(
          schoolService.ValidateLimit(baseSchool, 'classes', 5),
        ).resolves.not.toThrow();
        await expect(
          schoolService.ValidateLimit(baseSchool, 'subjects', 6),
        ).resolves.not.toThrow();
        await expect(
          schoolService.ValidateLimit(baseSchool, 'totalStorage', 50),
        ).resolves.not.toThrow();
      } catch (error) {
        throw error;
      }
    });

    it('should throw if totalStorage is exceeded', async () => {
      try {
        await expect(
          schoolService.ValidateLimit(baseSchool, 'totalStorage', 200),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          schoolService.ValidateLimit(baseSchool, 'totalStorage', 200),
        ).rejects.toThrow('Your storage size is reaching the limit');
      } catch (error) {
        throw error;
      }
    });

    it('should throw if class number is exceeded', async () => {
      try {
        await expect(
          schoolService.ValidateLimit(baseSchool, 'classes', 20),
        ).rejects.toThrow('Class number has reached the limit');
      } catch (error) {
        throw error;
      }
    });

    it('should throw if member number is exceeded', async () => {
      try {
        await expect(
          schoolService.ValidateLimit(baseSchool, 'members', 10),
        ).rejects.toThrow('Members on school has reached limit');
      } catch (error) {
        throw error;
      }
    });

    it('should throw if subject number is exceeded', async () => {
      try {
        await expect(
          schoolService.ValidateLimit(baseSchool, 'subjects', 10),
        ).rejects.toThrow('Subject number has reached limit');
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Upgrade Plan Premium ////////////////////////////

  describe('upgradePlanPremium', () => {
    it('should upgrade the school to PREMIUM plan with correct limits and stripe info', async () => {
      try {
        // สร้างโรงเรียนก่อนเพื่อให้มี schoolId ใช้งาน
        const createdSchool = await schoolService.schoolRepository.create({
          data: {
            title: 'School for Premium Upgrade',
            description: 'Testing upgrade to premium',
            plan: 'FREE',
            address: '123 Upgrade Rd',
            zipCode: '10000',
            logo: 'logo.png',
            blurHash: 'abc123',
            phoneNumber: '0888888888',
            country: 'Thailand',
            city: 'Bangkok',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_mockpremium',
          },
        });

        // ทำการอัปเกรด
        const newExpireAt = new Date();
        const upgraded = await schoolService.upgradePlanPremium(
          createdSchool.id,
          newExpireAt,
          'price_premium_001',
          'sub_premium_001',
        );

        // ตรวจสอบข้อมูลที่เปลี่ยน
        expect(upgraded).toBeDefined();
        expect(upgraded.id).toBe(createdSchool.id);
        expect(upgraded.plan).toBe('PREMIUM');
        expect(upgraded.stripe_price_id).toBe('price_premium_001');
        expect(upgraded.stripe_subscription_id).toBe('sub_premium_001');
        expect(upgraded.stripe_subscription_expireAt.toISOString()).toBe(
          newExpireAt.toISOString(),
        );
        expect(upgraded.limitSchoolMember).toBe(3);
        expect(upgraded.limitClassNumber).toBe(20);
        expect(upgraded.limitSubjectNumber).toBe(30);
        expect(upgraded.limitTotalStorage).toBe(107374182400);
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Upgrade Plan Enterprisem ////////////////////////////

  describe('upgradePlanEnterprise', () => {
    it('should upgrade the school to ENTERPRISE plan with correct limits and stripe info', async () => {
      try {
        // สร้างโรงเรียนสำหรับการทดสอบ
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Enterprise Test School',
            description: 'To be upgraded to ENTERPRISE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '789 Enterprise Rd',
            zipCode: '10200',
            logo: 'enterprise-logo.png',
            blurHash: 'blur123',
            phoneNumber: '0891234567',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_enterprise',
            plan: 'FREE',
          },
        });

        // เรียกใช้ upgradePlanEnterprise
        const subscriptionExpire = new Date();
        const result = await schoolService.upgradePlanEnterprise(
          school.id,
          subscriptionExpire,
          'price_enterprise_001',
          'sub_enterprise_001',
          200, // จำนวนสมาชิกที่กำหนด
        );

        // ตรวจสอบข้อมูลที่ได้
        expect(result).toBeDefined();
        expect(result.id).toBe(school.id);
        expect(result.plan).toBe('ENTERPRISE');
        expect(result.limitSchoolMember).toBe(200);
        expect(result.limitClassNumber).toBe(9999);
        expect(result.limitSubjectNumber).toBe(9999);
        expect(result.limitTotalStorage).toBe(10737418240000);
        expect(result.stripe_price_id).toBe('price_enterprise_001');
        expect(result.stripe_subscription_id).toBe('sub_enterprise_001');
        expect(result.stripe_subscription_expireAt.toISOString()).toBe(
          subscriptionExpire.toISOString(),
        );
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Upgrade Plan Enterprisem ////////////////////////////

  describe('upgradePlanFree', () => {
    it('should downgrade the school to FREE plan with correct limits', async () => {
      try {
        // สร้างโรงเรียนที่มีแผนอื่นก่อน (เช่น PREMIUM)
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Downgrade School',
            description: 'From premium to free',
            country: 'Thailand',
            city: 'Bangkok',
            address: '456 Downgrade St',
            zipCode: '10100',
            logo: 'downgrade.png',
            blurHash: 'downgrade-blur',
            phoneNumber: '0898765432',
            billingManagerId: mockUser.id,
            stripe_customer_id: 'cus_downgrade',
            stripe_price_id: 'price_premium',
            stripe_subscription_id: 'sub_premium',
            stripe_subscription_expireAt: new Date(),
            plan: 'PREMIUM',
            limitSchoolMember: 10,
            limitClassNumber: 50,
            limitSubjectNumber: 50,
            limitTotalStorage: 9999999999,
          },
        });

        // เรียกใช้ upgradePlanFree
        const downgraded = await schoolService.upgradePlanFree(school.id);

        // ตรวจสอบผลลัพธ์
        expect(downgraded).toBeDefined();
        expect(downgraded.id).toBe(school.id);
        expect(downgraded.plan).toBe('FREE');
        expect(downgraded.limitSchoolMember).toBe(2);
        expect(downgraded.limitClassNumber).toBe(3);
        expect(downgraded.limitSubjectNumber).toBe(3);
        expect(downgraded.limitTotalStorage).toBe(16106127360);
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Update School ////////////////////////////

  describe('updateSchool', () => {
    let school: School;

    beforeAll(async () => {
      // สร้างโรงเรียนและเพิ่ม user เป็นแอดมิน
      school = await schoolService.schoolRepository.create({
        data: {
          title: 'Initial Title',
          description: 'Initial Desc',
          country: 'Thailand',
          city: 'Bangkok',
          address: '1 Road',
          zipCode: '10000',
          logo: 'logo.png',
          phoneNumber: '0811111111',
          plan: 'FREE',
          billingManagerId: mockUser.id,
          stripe_customer_id: 'cus_update_test_0001',
        },
      });

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
    });

    it('should update school details successfully', async () => {
      try {
        const dto: UpdateSchoolDto = {
          query: { schoolId: school.id },
          body: {
            title: 'Updated School',
            description: 'New Desc',
            phoneNumber: '0888888888',
            billingManagerId: undefined, // ไม่อัปเดต billing
          },
        };

        const updated = await schoolService.updateSchool(dto, mockUser);

        expect(updated.title).toBe(dto.body.title);
        expect(updated.description).toBe(dto.body.description);
        expect(updated.phoneNumber).toBe(dto.body.phoneNumber);
      } catch (error) {
        throw error;
      }
    });

    it("should throw ForbiddenException if user isn't admin", async () => {
      try {
        const notAdmin = {
          id: '66500e4ea1b3f5370ac111f2',
          firstName: 'Not',
          lastName: 'Admin',
          email: 'notadmin@gmail.com',
          photo: 'https://example.com/photo.jpg',
          phone: '0899999988',
        } as User;

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: notAdmin.id,
          email: notAdmin.email,
          firstName: notAdmin.firstName,
          lastName: notAdmin.lastName,
          photo: notAdmin.photo,
          phone: notAdmin.phone,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const dto: UpdateSchoolDto = {
          query: { schoolId: school.id },
          body: { title: 'Hacked' },
        };

        await expect(schoolService.updateSchool(dto, notAdmin)).rejects.toThrow(
          ForbiddenException,
        );
      } catch (error) {
        throw error;
      }
    });

    it('should throw NotFoundException if billingManagerId user not found', async () => {
      try {
        const dto: UpdateSchoolDto = {
          query: { schoolId: school.id },
          body: { billingManagerId: '012345678901234567890123' },
        };

        await expect(schoolService.updateSchool(dto, mockUser)).rejects.toThrow(
          NotFoundException,
        );
      } catch (error) {
        throw error;
      }
    });

    it('should throw BadRequestException if billingManagerId is same as current', async () => {
      try {
        // สร้าง user ให้ตรงกับ mockUser.id ก่อน
        const user = await userService.userRepository.createUser({
          firstName: 'test',
          lastName: 'update',
          email: 'testupdate@gmail.com',
          phone: '0945678906',
          password: 'secret_password123',
          provider: 'LOCAL',
          role: 'USER',
          photo:
            'https://storage.googleapis.com/public-tatugaschool/avatars/15.png',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Same Manager School',
            description: 'Desc',
            country: 'Thailand',
            city: 'CNX',
            address: '123',
            zipCode: '50000',
            logo: 'test.png',
            phoneNumber: '0808888888',
            billingManagerId: user.id,
            plan: 'FREE',
            stripe_customer_id: 'cus_same_0001',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          photo: user.photo,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        const dto: UpdateSchoolDto = {
          query: { schoolId: school.id },
          body: { billingManagerId: user.id }, // same
        };

        await expect(schoolService.updateSchool(dto, user)).rejects.toThrow(
          BadRequestException,
        );
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Delete School ////////////////////////////

  describe('deleteSchool', () => {
    it('should delete school successfully if user is admin and only member', async () => {
      // Mock Stripe del
      stripeService.customers = {
        del: jest.fn().mockResolvedValue({ id: 'cus_mocked', deleted: true }),
      } as any;

      const school = await schoolService.schoolRepository.create({
        data: {
          title: 'โรงเรียนทดสอบ',
          description: 'รายละเอียดโรงเรียนทดสอบ',
          country: 'Thailand',
          city: 'Khon Kaen',
          address: '123 ถนนหลัก ตำบลในเมือง อำเภอเมือง',
          zipCode: '40000',
          logo: 'https://example.com/logo.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          phoneNumber: '0891234567',
          stripe_customer_id: 'cus_mocked', // ใช้ค่าเดียวกับ mock
        },
      });

      await memberOnSchoolService.memberOnSchoolRepository.create({
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        phone: mockUser.phone,
        photo: mockUser.photo,
        schoolId: school.id,
        role: 'ADMIN',
        status: 'ACCEPT',
      });

      const dto = { schoolId: school.id };

      const result = await schoolService.deleteSchool(dto, mockUser);
      expect(result).toBeDefined();
      expect(result.id).toBe(school.id);
    });

    it('should throw NotFoundException if school does not exist', async () => {
      try {
        const dto = { schoolId: '001122334455667788991234' };

        await schoolService.deleteSchool(dto, mockUser);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('school not found');
      }
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden School',
            description: 'No admin rights',
            country: 'Thailand',
            city: 'BKK',
            address: 'Somewhere',
            zipCode: '10100',
            logo: 'fb.png',
            phoneNumber: '0888888888',
            billingManagerId: mockUser.id,
            plan: 'FREE',
            stripe_customer_id: `cus_forbid_${Date.now()}`,
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          schoolId: school.id,
          role: 'TEACHER', // ไม่ใช่ ADMIN
          status: 'ACCEPT',
        });

        const dto = { schoolId: school.id };

        await schoolService.deleteSchool(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not an admin");
      }
    });

    it('should throw BadRequestException if more than one member exists', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Too Many',
            description: 'Cannot delete',
            country: 'Thailand',
            city: 'KKU',
            address: 'Multi St',
            zipCode: '40000',
            logo: 'multi.png',
            phoneNumber: '0877777777',
            billingManagerId: mockUser.id,
            plan: 'FREE',
            stripe_customer_id: `cus_multi_${Date.now()}`,
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser2.id,
          email: mockUser2.email,
          firstName: mockUser2.firstName,
          lastName: mockUser2.lastName,
          phone: mockUser2.phone,
          photo: mockUser2.photo,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const dto = { schoolId: school.id };

        await schoolService.deleteSchool(dto, mockUser);
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'You are not allow to delete school until you delete every members from the school first',
        );
      }
    });
  });
});
