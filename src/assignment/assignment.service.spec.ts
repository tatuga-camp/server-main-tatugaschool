import { AttendanceStatusListService } from './../attendance-status-list/attendance-status-list.service';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
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
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  UpdateAssignmentDto,
} from './dto';

import { fail } from 'assert';
import { StudentOnAssignmentService } from '../student-on-assignment/student-on-assignment.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('Assignment Service', () => {
  let assignmentService: AssignmentService;
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
  let fileAssignmentService: FileAssignmentService;
  let attendanceStatusListService: AttendanceStatusListService;
  let subscriptionService: SubscriptionService;

  const schoolService = new SchoolService(
    prismaService,
    stripeService,
    memberOnSchoolService,
    googleStorageService,
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
    assignmentService,
    fileAssignmentService,
    attendanceStatusListService,
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

  const studentOnAssignmentService = new StudentOnAssignmentService(
    prismaService,
    googleStorageService,
    teacherOnSubjectService,
    pushService,
    skillOnStudentAssignmentService,
  );

  beforeEach(async () => {
    assignmentService = new AssignmentService(
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
  });

  const mockUser = {
    id: '66500e4ea1b3f5370ac122f1',
    firstName: 'Petch',
    lastName: 'Assignment Service',
    email: 'petchassignmentservice@gmail.com',
    photo: 'https://example.com/photo.jpg',
    phone: '0891234567',
  } as User;

  /////////////////////////////// Create Assignment ////////////////////////////

  describe('createAssignment', () => {
    // กรณี Assignment ปกติ
    it('should create assignment (type Assignment)', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Khon Kaen University',
            description: 'A public research university in Thailand',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Khon Kaen',
            address: '123 University Ave',
            zipCode: '40000',
            logo: 'https://example.com/logo.png',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            phoneNumber: '043202222',
            stripe_customer_id: 'cus_ABC123XYZ456',
            stripe_price_id: 'price_12345',
            stripe_subscription_id: 'sub_67890',
          },
        });

        const memberOnSchool =
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

        const classroom = await classroomService.classRepository.create({
          title: 'Computer Science Year 3',
          description: '3rd Year CS Students',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Web Development',
          description:
            'Building modern web applications with React and Node.js',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'CS304',
        });

        const teacherOnSubject =
          await teacherOnSubjectService.teacherOnSubjectRepository.create({
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            photo: mockUser.photo,
            phone: mockUser.phone,
            status: 'ACCEPT',
            role: 'ADMIN',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            subjectId: subject.id,
            schoolId: school.id,
          });

        const dto: CreateAssignmentDto = {
          title: 'Final Project: Portfolio Website',
          description: 'Build and deploy a personal portfolio using Next.js',
          dueDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          beginDate: new Date().toISOString(),
          type: 'Assignment',
          maxScore: 20,
        };

        const create = await assignmentService.createAssignment(dto, mockUser);
        expect(create).toBeDefined();
        expect(create.id).toBeDefined();
        expect(create.title).toBe(dto.title);
        expect(create.description).toBe(dto.description);
        expect(create.dueDate.toISOString()).toEqual(dto.dueDate);
        expect(create.status).toBe(dto.status);
        expect(create.subjectId).toBe(dto.subjectId);
        expect(create.beginDate.toISOString()).toEqual(dto.beginDate);
        expect(create.type).toBe(dto.type);
        expect(create.maxScore).toBe(dto.maxScore);
      } catch (error) {
        throw error;
      }
    });

    // ขาด beginDate สำหรับ type: Assignment
    it('should throw if type=Assignment and missing beginDate', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Khon Kaen University',
            description: 'A public research university in Thailand',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Khon Kaen',
            address: '123 University Ave',
            zipCode: '40000',
            logo: 'https://example.com/logo.png',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            phoneNumber: '043202222',
            stripe_customer_id: 'cus_ABC123XYZ740',
            stripe_price_id: 'price_12345',
            stripe_subscription_id: 'sub_67890',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Test Class',
          description: '...',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Test Subject',
          description: '...',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'CS403',
        });

        const dto: CreateAssignmentDto = {
          title: 'Invalid Assignment',
          description: 'Missing fields',
          dueDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          beginDate: undefined,
          maxScore: 20,
        } as any;

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected error to be thrown for missing fields');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Assign at and max score are required for assignment ',
        );
      }
    });

    // ขาด maxScore สำหรับ type: Assignment
    it('should throw if type=Assignment and missing maxScore', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Khon Kaen University',
            description: 'A public research university in Thailand',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Khon Kaen',
            address: '123 University Ave',
            zipCode: '40000',
            logo: 'https://example.com/logo.png',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            phoneNumber: '043202222',
            stripe_customer_id: 'cus_ABC123XYZ450',
            stripe_price_id: 'price_12345',
            stripe_subscription_id: 'sub_67890',
          },
        });
        const classroom = await classroomService.classRepository.create({
          title: 'Test Class',
          description: '...',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Test Subject',
          description: '...',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'CS404',
        });

        const dto: CreateAssignmentDto = {
          title: 'Invalid Assignment',
          description: 'Missing fields',
          dueDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          beginDate: new Date().toISOString(),
          maxScore: undefined,
        } as any;

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected error to be thrown for missing fields');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Assign at and max score are required for assignment ',
        );
      }
    });

    // ขาด beginDate กับ maxScore สำหรับ type: Assignment
    it('should throw if type=Assignment and missing beginDate and maxScore', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Khon Kaen University',
            description: 'A public research university in Thailand',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Khon Kaen',
            address: '123 University Ave',
            zipCode: '40000',
            logo: 'https://example.com/logo.png',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            phoneNumber: '043202222',
            stripe_customer_id: 'cus_ABC123XYZ790',
            stripe_price_id: 'price_12345',
            stripe_subscription_id: 'sub_67890',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Test Class',
          description: '...',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Test Subject',
          description: '...',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'CS405',
        });

        const dto: CreateAssignmentDto = {
          title: 'Invalid Assignment',
          description: 'Missing fields',
          dueDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          maxScore: undefined,
          beginDate: undefined,
        } as any;

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected error to be thrown for missing fields');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(
          'Assign at and max score are required for assignment ',
        );
      }
    });

    // กรณี Material ปกติ
    it('should create assignment (type Material)', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Khon Kaen University',
            description: 'A public research university in Thailand',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Khon Kaen',
            address: '123 University Ave',
            zipCode: '40000',
            logo: 'https://example.com/logo.png',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            phoneNumber: '043202222',
            stripe_customer_id: 'cus_ABC123XYZ789',
            stripe_price_id: 'price_12345',
            stripe_subscription_id: 'sub_67890',
          },
        });

        const memberOnSchool =
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

        const classroom = await classroomService.classRepository.create({
          title: 'Computer Science Year 3',
          description: '3rd Year CS Students',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'UX/UI',
          description: 'Design modern web applications with Figma',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'CS305',
        });

        const teacherOnSubject =
          await teacherOnSubjectService.teacherOnSubjectRepository.create({
            userId: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            photo: mockUser.photo,
            phone: mockUser.phone,
            status: 'ACCEPT',
            role: 'ADMIN',
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            subjectId: subject.id,
            schoolId: school.id,
          });

        const dto: CreateAssignmentDto = {
          title: 'Final Project: Design Portfolio Website',
          description: 'Design a personal portfolio using Figma',
          dueDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          beginDate: new Date().toISOString(),
          type: 'Material',
          maxScore: 20,
          weight: 10,
        };

        const create = await assignmentService.createAssignment(dto, mockUser);
        expect(create).toBeDefined();
        expect(create.id).toBeDefined();
        expect(create.title).toBe(dto.title);
        expect(create.description).toBe(dto.description);
        expect(create.status).toBe(dto.status);
        expect(create.subjectId).toBe(dto.subjectId);
        expect(create.type).toBe(dto.type);
        expect(create.dueDate).toBeNull();
        expect(create.maxScore).toBeNull();
        expect(create.weight).toBeNull();
      } catch (error) {
        throw error;
      }
    });
    // user ไม่ได้เป็น memberOnSchool (ไม่มี)
    it('should throw if user is not a memberOnSchool (missing)', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoMemberSchool',
            description: 'School for missing member test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Missing St.',
            zipCode: '10000',
            logo: 'logo.png',
            blurHash: 'abc123',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_x1',
            stripe_price_id: 'price_x1',
            stripe_subscription_id: 'sub_x1',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Unlinked Class',
          description: 'For missing member test',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Unlinked Subject',
          description: 'No member linked',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'UN001',
        });

        const dto: CreateAssignmentDto = {
          title: 'Missing member assignment',
          description: 'Should fail',
          dueDate: new Date().toISOString(),
          beginDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          maxScore: 10,
        };

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // user เป็น memberOnSchool แต่ status !== ACCEPT
    it('should throw if user is memberOnSchool but status !== ACCEPT', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'PendingMemberSchool',
            description: 'School for pending status test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Chiang Mai',
            address: '456 Pending Rd.',
            zipCode: '50000',
            logo: 'logo2.png',
            blurHash: 'xyz789',
            phoneNumber: '0888888888',
            stripe_customer_id: 'cus_x2',
            stripe_price_id: 'price_x2',
            stripe_subscription_id: 'sub_x2',
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
          role: 'TEACHER',
          status: 'PENDDING', // ไม่ใช่ ACCEPT
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Pending Class',
          description: 'For status !== ACCEPT test',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Pending Subject',
          description: 'Linked with PENDING member',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'PN001',
        });

        const dto: CreateAssignmentDto = {
          title: 'Pending member assignment',
          description: 'Should fail',
          dueDate: new Date().toISOString(),
          beginDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          maxScore: 10,
        };

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // user ไม่ได้เป็น memberOnSubject (ไม่มี)
    it('should throw if user is not teacherOnSubject (missing)', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoTeacherLinkSchool',
            description: 'Test missing teacherOnSubject',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Udon Thani',
            address: '789 Teacher Rd.',
            zipCode: '41000',
            logo: 'logo3.png',
            blurHash: 'def456',
            phoneNumber: '0777777777',
            stripe_customer_id: 'cus_x3',
            stripe_price_id: 'price_x3',
            stripe_subscription_id: 'sub_x3',
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
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'No Teacher Class',
          description: 'Teacher not assigned to subject',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Unassigned Subject',
          description: 'Teacher not linked',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'NT001',
        });

        const dto: CreateAssignmentDto = {
          title: 'Missing teacher assignment',
          description: 'Should fail',
          dueDate: new Date().toISOString(),
          beginDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          maxScore: 10,
        };

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // user เป็น memberOnSubject แต่ status !== ACCEPT
    it('should throw if user is teacherOnSubject but status !== ACCEPT', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'PendingTeacherLinkSchool',
            description: 'Teacher link but not ACCEPT',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Phuket',
            address: '654 Teacher St.',
            zipCode: '83000',
            logo: 'logo4.png',
            blurHash: 'ghi789',
            phoneNumber: '0666666666',
            stripe_customer_id: 'cus_x4',
            stripe_price_id: 'price_x4',
            stripe_subscription_id: 'sub_x4',
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
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Teacher Pending Class',
          description: 'Class for pending teacher subject',
          level: 'Undergraduate',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Pending Teacher Subject',
          description: 'Teacher assigned but status pending',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'TP001',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          status: 'PENDDING', // ไม่ใช่ ACCEPT
          role: 'TEACHER',
          blurHash: 'xyz',
          subjectId: subject.id,
          schoolId: school.id,
        });

        const dto: CreateAssignmentDto = {
          title: 'Pending teacher subject',
          description: 'Should fail',
          dueDate: new Date().toISOString(),
          beginDate: new Date().toISOString(),
          status: 'Published',
          subjectId: subject.id,
          type: 'Assignment',
          maxScore: 10,
        };

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // subjectId ไม่พบในระบบ
    it('should throw if subject not found', async () => {
      try {
        const dto: CreateAssignmentDto = {
          title: 'Assignment with invalid subject',
          description: 'Subject does not exist',
          dueDate: new Date().toISOString(),
          beginDate: new Date().toISOString(),
          status: 'Published',
          subjectId: '66520ff9016313d8fc1db333',
          type: 'Assignment',
          maxScore: 10,
        };

        await assignmentService.createAssignment(dto, mockUser);
        fail('Expected error to be thrown for non-existent subject');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject Not Found');
      }
    });
  });

  /////////////////////////////// Update Assignment ////////////////////////////

  describe('updateAssignment', () => {
    // กรณี assignment ไม่พบ
    it('should throw if assignment not found', async () => {
      try {
        const dto: UpdateAssignmentDto = {
          query: {
            assignmentId: '123456789012345678901234',
          },
          data: {
            title: 'Updated title',
            description: 'Updated desc',
            maxScore: 20,
            weight: 5,
            beginDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            status: 'Published',
          },
        };

        await assignmentService.updateAssignment(dto, mockUser);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Assignment not found');
      }
    });

    // กรณี subject ของ assignment ไม่พบ
    it('should throw if subject of assignment not found', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Missing Subject School',
            description: 'Test subject missing',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Test Rd',
            zipCode: '10000',
            logo: 'logo.png',
            blurHash: 'abc123',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_missing_subject01',
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

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Should not update',
            description: 'Because subject missing',
            type: 'Assignment',
            beginDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            subjectId: '123456789012345678901234',
            schoolId: school.id,
            status: 'Published',
            maxScore: 10,
            weight: 5,
          },
        });

        const dto: UpdateAssignmentDto = {
          query: { assignmentId: assignment.id },
          data: {
            title: 'Attempted Update',
            description: 'Still fail',
            beginDate: new Date().toISOString(),
            maxScore: 10,
            status: 'Published',
          },
        };

        await assignmentService.updateAssignment(dto, mockUser);
        fail('Expected NotFoundException for subject not found');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject Not Found');
      }
    });

    // User ไม่ใช่ member ของโรงเรียน
    it('should throw if user is not member of the school', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Missing Member on school',
            description: 'Test not member on school',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Test Rd',
            zipCode: '10000',
            logo: 'logo.png',
            blurHash: 'abc123',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_missing_subject02',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Class for orphan subject',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'No Member Subject',
          description: '...desc',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'NO1',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Should not update',
            description: 'Because missing member on school',
            type: 'Assignment',
            beginDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            subjectId: subject.id,
            schoolId: school.id,
            status: 'Published',
            maxScore: 10,
            weight: 5,
          },
        });

        const dto: UpdateAssignmentDto = {
          query: { assignmentId: assignment.id },
          data: {
            title: 'Try Update',
            description: 'New desc',
            beginDate: new Date().toISOString(),
            maxScore: 20,
            status: 'Published',
          },
        };

        await assignmentService.updateAssignment(dto, mockUser);
        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // User ยังไม่ ACCEPT Subject
    it('should throw if teacherOnSubject status !== ACCEPT', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Pending Teacher School',
            description: 'Test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Main St',
            zipCode: '10000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_test_01',
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
          status: 'ACCEPT',
          role: 'TEACHER',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Pending Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Pending Teacher Subject',
          description: 'Test',
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          classId: classroom.id,
          code: 'TP002',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          blurHash: 'xyz',
          role: 'TEACHER',
          status: 'PENDDING',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Needs Teacher Accept',
            description: 'Desc',
            type: 'Assignment',
            beginDate: new Date(),
            subjectId: subject.id,
            schoolId: school.id,
            status: 'Published',
          },
        });

        const dto: UpdateAssignmentDto = {
          query: { assignmentId: assignment.id },
          data: {
            title: 'Update Attempt',
            description: 'Still fail',
            beginDate: new Date().toISOString(),
            maxScore: 10,
            status: 'Published',
          },
        };

        await assignmentService.updateAssignment(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a teacher on this subject");
      }
    });

    // User อัปเดต Assignment สำเร็จ (ADMIN)
    it('should update assignment if user is ADMIN', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Admin School',
            description: 'Admin test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'KKU',
            address: '321 Uni Rd',
            zipCode: '40000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_admin',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          role: 'ADMIN',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Admin Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Admin Subject',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'ADM001',
          description: 'Admin sub',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Old Title',
            description: 'Old Desc',
            subjectId: subject.id,
            type: 'Assignment',
            beginDate: new Date(),
            schoolId: school.id,
            status: 'Published',
          },
        });

        const dto: UpdateAssignmentDto = {
          query: { assignmentId: assignment.id },
          data: {
            title: 'New Title',
            description: 'New Desc',
            beginDate: new Date().toISOString(),
            maxScore: 20,
            status: 'Published',
          },
        };

        const result = await assignmentService.updateAssignment(dto, mockUser);
        expect(result).toBeDefined();
        expect(result.title).toBe('New Title');
        expect(result.description).toBe('New Desc');
        expect(result.beginDate.toISOString()).toEqual(dto.data.beginDate);
        expect(result.maxScore).toBe(20);
        expect(result.status).toBe('Published');
      } catch (error) {
        throw error;
      }
    });

    // User อัปเดต Assignment สำเร็จ (TEACHER)
    it('should update assignment if user is TEACHER', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Teacher School',
            description: 'Teacher test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'KKU',
            address: '321 Uni Rd',
            zipCode: '40000',
            logo: 'logo.png',
            phoneNumber: '0888888888',
            stripe_customer_id: 'cus_teacher_01',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Teacher Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Teacher Subject',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'TCH001',
          description: 'Teacher subject description',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Old Teacher Assignment',
            description: 'Initial desc',
            subjectId: subject.id,
            type: 'Assignment',
            beginDate: new Date(),
            schoolId: school.id,
            status: 'Published',
          },
        });

        const dto: UpdateAssignmentDto = {
          query: { assignmentId: assignment.id },
          data: {
            title: 'Updated by Teacher',
            description: 'Teacher update desc',
            beginDate: new Date().toISOString(),
            maxScore: 25,
            status: 'Published',
          },
        };

        const result = await assignmentService.updateAssignment(dto, mockUser);

        expect(result).toBeDefined();
        expect(result.title).toBe(dto.data.title);
        expect(result.description).toBe(dto.data.description);
        expect(result.beginDate.toISOString()).toEqual(dto.data.beginDate);
        expect(result.maxScore).toBe(25);
        expect(result.status).toBe('Published');
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Get Assignment By Assignment Id ////////////////////////////

  describe('getAssignmentById', () => {
    // กรณี assignment ไม่พบในระบบ
    it('should throw NotFoundException if assignment not found', async () => {
      try {
        const dto: GetAssignmentByIdDto = {
          assignmentId: '123456789012345678901234',
        };

        await assignmentService.getAssignmentById(dto, mockUser);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Assignment not found');
      }
    });
    // กรณี user ไม่มีสิทธิ์ใน subject ของ assignment นั้น
    it('should throw ForbiddenException if user has no access to subject', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoAccessSchool',
            description: 'Test for no access',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Forbidden Rd',
            zipCode: '10100',
            logo: 'logo.png',
            phoneNumber: '0888888888',
            stripe_customer_id: 'cus_noaccess',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Forbidden Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Forbidden Subject',
          description: 'For access denied',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'FORB001',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Forbidden Assignment',
            description: 'Cannot view this',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const dto: GetAssignmentByIdDto = {
          assignmentId: assignment.id,
        };

        // ไม่ได้สร้าง memberOnSchool หรือ teacherOnSubject
        await assignmentService.getAssignmentById(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });
    // กรณี User เข้าถึง assignment ได้สำเร็จ พร้อมได้ files และ skills กลับมา
    it('should return assignment with files and skills if access granted', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Access School',
            description: 'Allow access',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Chiang Mai',
            address: '456 Allowed Rd',
            zipCode: '50000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_access',
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
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Access Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Accessible Subject',
          description: 'You can see this',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'ACC001',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          blurHash: 'hash',
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Accessible Assignment',
            description: 'Full access',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        // เพิ่ม skill ให้ assignment
        const skill = await skillService.skillRepository.create({
          title: 'HTML',
          description: 'HTML Skill',
          keywords: 'html,markup',
          vector: [0.2, 0.3],
        });

        await assignmentService.assignmentRepository.skillOnAssignmentRepository.create(
          {
            skillId: skill.id,
            assignmentId: assignment.id,
            subjectId: subject.id,
          },
        );

        // เพิ่มไฟล์ให้ assignment
        await assignmentService.assignmentRepository.fileAssignmentRepository.create(
          {
            type: 'pdf',
            url: 'https://example.com/file.pdf',
            size: 123456,
            assignmentId: assignment.id,
            subjectId: subject.id,
            schoolId: school.id,
          },
        );

        const dto: GetAssignmentByIdDto = {
          assignmentId: assignment.id,
        };

        const result = await assignmentService.getAssignmentById(dto, mockUser);

        expect(result).toBeDefined();
        expect(result.id).toBe(assignment.id);
        expect(result.title).toBe(assignment.title);
        expect(result.files.length).toBeGreaterThan(0);
        expect(result.skills.length).toBeGreaterThan(0);
        expect(result.skills[0].title).toBe('HTML');
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Get Assignment By Subject Id ////////////////////////////

  describe('getAssignmentBySubjectId', () => {
    // กรณี subject ไม่พบ
    it('should throw NotFoundException if subject not found', async () => {
      try {
        const dto: GetAssignmentBySubjectIdDto = {
          subjectId: '123456789012345678901234',
        };

        await assignmentService.getAssignmentBySubjectId(dto, mockUser);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject Not Found');
      }
    });

    // กรณี user ไม่ใช่ member ของโรงเรียน
    it('should throw ForbiddenException if user is not a member of the school', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'School',
            description: 'Allow access',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Chiang Mai',
            address: '456 Allowed Rd',
            zipCode: '50000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_sss',
          },
        });

        const classroom = await classroomService.classRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          title: 'Class',
          level: 'UG',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Subject',
          description: 'You can not see this',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: 'SUB01',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          blurHash: 'hash',
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Accessible Assignment',
            description: 'Full access',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const dto: GetAssignmentBySubjectIdDto = { subjectId: subject.id };
        await assignmentService.getAssignmentBySubjectId(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณี student ไม่ได้ลงทะเบียนใน subject
    it('should throw ForbiddenException if student is not enrolled in the subject', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'School',
            description: 'Allow access',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Chiang Mai',
            address: '456 Allowed Rd',
            zipCode: '50000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_sssssdfds',
          },
        });

        const classroom = await classroomService.classRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          title: 'Class',
          level: 'UG',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Subject',
          description: 'You can not see this',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: 'SUB_jjj',
        });

        const student = await studentService.studentRepository.create({
          title: 'นาย',
          firstName: 'สมชาย',
          lastName: 'พะยองเดช',
          photo: 'pic.jpg',
          number: '25',
          schoolId: school.id,
          classId: classroom.id,
        });

        const dto: GetAssignmentBySubjectIdDto = { subjectId: subject.id };

        await assignmentService.getAssignmentBySubjectId(
          dto,
          undefined,
          student,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Student not enrolled in this subject');
      }
    });

    // กรณี teacher เรียกดู assignment สำเร็จ
    it('should return assignments with files and stats for valid teacher', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Teacher School',
            description: 'Teacher School',
            plan: 'FREE',
            country: 'Thailand',
            city: 'BKK',
            address: '1',
            zipCode: '10000',
            phoneNumber: '0000000000',
            logo: 'none.png',
            stripe_customer_id: 'cus_xer',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
        });

        const classroom = await classroomService.classRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          title: 'Class',
          level: 'UG',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Subject',
          description: 'You can see this',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: 'SUB001',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          status: 'ACCEPT',
          role: 'TEACHER',
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          blurHash: 'xyz',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Accessible Assignment',
            description: 'Full access',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const dto: GetAssignmentBySubjectIdDto = { subjectId: subject.id };
        const result = await assignmentService.getAssignmentBySubjectId(
          dto,
          mockUser,
        );

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(assignment.id);
      } catch (error) {
        throw error;
      }
    });

    // กรณี student เรียกดู assignment สำเร็จ
    it('should return published assignments assigned to student with stats', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Student School',
            description: 'Student School',
            plan: 'FREE',
            country: 'Thailand',
            city: 'BKK',
            address: '1',
            zipCode: '10000',
            phoneNumber: '0000000000',
            logo: 'none.png',
            stripe_customer_id: `cus_asd`,
          },
        });

        const classroom = await classroomService.classRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          title: 'Class',
          level: 'UG',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Subject ddd',
          description: 'You can see this',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: `SUB_sssss`,
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Accessible Assignment ggg',
            description: 'Full access',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const student = await studentService.studentRepository.create({
          title: 'นางสาว',
          firstName: 'สมหญิง',
          lastName: 'พะยองเดโช',
          photo: 'https://example.com/photo.jpg',
          number: '76',
          schoolId: school.id,
          classId: classroom.id,
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        });
        console.log(student.id);
        console.log(subject.id);
        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              studentId: student.id,
              subjectId: subject.id,
            },
          });

        const studentOnAssignment =
          await studentOnAssignmentService.studentOnAssignmentRepository.getByStudentIdAndAssignmentId(
            {
              studentId: student.id,
              assignmentId: assignment.id,
            },
          );
        console.log(student.id);
        console.log(assignment.id);
        await studentOnAssignmentService.studentOnAssignmentRepository.update({
          where: { id: studentOnAssignment.id },
          data: {
            score: 0,
            status: 'PENDDING',
            isAssigned: true,
            body: '',
          },
        });

        const dto: GetAssignmentBySubjectIdDto = { subjectId: subject.id };
        const result = await assignmentService.getAssignmentBySubjectId(
          dto,
          undefined,
          student,
        );

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(assignment.id);
        expect(result[0].studentOnAssignment).toBeDefined();
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Get Overview Score On Assignment ////////////////////////////

  describe('getOverviewScoreOnAssignments', () => {
    // กรณี access ถูกปฏิเสธ
    it('should throw ForbiddenException if teacher has no access to subject', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden School',
            description: 'No access',
            plan: 'FREE',
            country: 'Thailand',
            city: 'BKK',
            address: '1',
            zipCode: '10000',
            phoneNumber: '0000000000',
            logo: 'none.png',
            stripe_customer_id: 'cus_ksdfgkdf',
          },
        });

        const classroom = await classroomService.classRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          title: 'Class 1',
          level: 'UG',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Restricted Subject',
          description: 'No teacher access',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: 'SUB_sdfdsfds',
        });

        const dto = { subjectId: subject.id };
        await assignmentService.getOverviewScoreOnAssignments(dto, mockUser);

        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณีสำเร็จ
    it('should return correct assignments, grade, and scores', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Access School',
            description: 'Allow access',
            plan: 'FREE',
            country: 'Thailand',
            city: 'CM',
            address: '100 Access Rd',
            zipCode: '50000',
            phoneNumber: '0999999999',
            logo: 'logo.png',
            stripe_customer_id: 'cus_asdasdasd',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: mockUser.id,
          schoolId: school.id,
          role: 'TEACHER',
          status: 'ACCEPT',
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
        });

        const classroom = await classroomService.classRepository.create({
          schoolId: school.id,
          userId: mockUser.id,
          title: 'Grade A',
          level: 'UG',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Overview Subject',
          description: 'Graded Subject',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: 'SUB_asdasdasd',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          status: 'ACCEPT',
          role: 'TEACHER',
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          blurHash: 'xyz',
        });

        const student = await studentService.studentRepository.create({
          title: 'นาย',
          firstName: 'นักเรียน',
          lastName: 'ดีเด่น',
          photo: 'std.jpg',
          number: '01',
          schoolId: school.id,
          classId: classroom.id,
          blurHash: 'blurrr',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              studentId: student.id,
              subjectId: subject.id,
            },
          });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Quiz 1',
            description: 'Basic test',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        await studentOnAssignmentService.studentOnAssignmentRepository.create({
          title: student.title,
          firstName: student.firstName,
          lastName: student.lastName,
          photo: student.photo,
          number: student.number,
          blurHash: student.blurHash,
          studentId: student.id,
          assignmentId: assignment.id,
          studentOnSubjectId: studentOnSubject.id,
          schoolId: student.schoolId,
          subjectId: subject.id,
          score: 90,
        });

        const grade = await gradeService.gradeRepository.create({
          data: {
            subjectId: subject.id,
            schoolId: school.id,
            gradeRules: JSON.stringify([
              { min: 80, max: 100, grade: 'A' },
              { min: 70, max: 79, grade: 'B' },
              { min: 60, max: 69, grade: 'C' },
              { min: 50, max: 59, grade: 'D' },
              { min: 0, max: 49, grade: 'F' },
            ]),
          },
        });

        const scoreOnSubject =
          await scoreOnSubjectService.scoreOnSubjectRepository.createSocreOnSubject(
            {
              score: 100,
              title: 'คะแนนเก็บ',
              icon: 'https://example.com/icons/score.png',
              blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
              subjectId: subject.id,
              schoolId: school.id,
            },
          );

        await scoreOnStudentService.scoreOnStudentRepository.createSocreOnStudent(
          {
            score: 85,
            blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
            title: 'คะแนนกลางภาค',
            icon: 'https://example.com/icons/midterm.png',
            subjectId: subject.id,
            scoreOnSubjectId: scoreOnSubject.id,
            studentId: student.id,
            schoolId: school.id,
            studentOnSubjectId: studentOnSubject.id,
          },
        );

        const result = await assignmentService.getOverviewScoreOnAssignments(
          { subjectId: subject.id },
          mockUser,
        );

        expect(result).toBeDefined();
        expect(result.grade?.subjectId).toBe(subject.id);
        expect(result.grade?.gradeRules).toEqual([
          { min: 80, max: 100, grade: 'A' },
          { min: 70, max: 79, grade: 'B' },
          { min: 60, max: 69, grade: 'C' },
          { min: 50, max: 59, grade: 'D' },
          { min: 0, max: 49, grade: 'F' },
        ]);

        // หา assignment ตาม id
        const foundAssignment = result.assignments.find(
          (a) => a.assignment.id === assignment.id,
        );
        expect(foundAssignment).toBeDefined();
        expect(foundAssignment!.students.length).toBe(1);
        expect(foundAssignment!.students[0].score).toBe(90);

        // หา scoreOnSubject ตาม id
        const foundScoreOnSubject = result.scoreOnSubjects.find(
          (s) => s.scoreOnSubject.id === scoreOnSubject.id,
        );
        expect(foundScoreOnSubject).toBeDefined();
        expect(foundScoreOnSubject!.students.length).toBe(1);
        expect(foundScoreOnSubject!.students[0].score).toBe(85);
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// Delete Assignment ////////////////////////////

  describe('deleteAssignment', () => {
    // กรณี assignment ไม่พบ
    it('should throw NotFoundException if assignment not found', async () => {
      try {
        const dto: DeleteAssignmentDto = {
          assignmentId: '000000000000000000000000', // fake ID
        };

        await assignmentService.deleteAssignment(dto, mockUser);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Assignment not found');
      }
    });

    // กรณี user ไม่มีสิทธิ์ลบ assignment (ไม่ใช่ teacherOnSubject)
    it('should throw ForbiddenException if user has no access to subject', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete School',
            description: 'For permission test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 NoAccess Rd',
            zipCode: '10000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_xdelete01',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Delete Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'NoAccess Subject',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'DEL001',
          description: 'No access to this',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Should Not Delete',
            description: 'Should Not Delete',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const dto: DeleteAssignmentDto = {
          assignmentId: assignment.id,
        };

        await assignmentService.deleteAssignment(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณีลบ assignment สำเร็จ
    it('should delete assignment successfully', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Delete Success School',
            description: 'For delete success test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Chiang Mai',
            address: '999 Delete Rd',
            zipCode: '50000',
            logo: 'logo.png',
            phoneNumber: '0888888888',
            stripe_customer_id: 'cus_xdelete02',
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
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Delete Success Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Delete Subject',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'DEL002',
          description: 'Test subject',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          blurHash: 'abc',
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Assignment to Delete',
            description: 'Assignment to Delete',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const dto: DeleteAssignmentDto = {
          assignmentId: assignment.id,
        };

        const deleted = await assignmentService.deleteAssignment(dto, mockUser);

        expect(deleted).toBeDefined();
        expect(deleted.id).toBe(assignment.id);
        expect(deleted.title).toBe('Assignment to Delete');

        const check = await assignmentService.assignmentRepository.getById({
          assignmentId: assignment.id,
        });

        expect(check).toBeNull();
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// reorder ////////////////////////////

  describe('reorder', () => {
    // กรณี assignmentIds บางตัวหาไม่เจอ
    it('should throw NotFoundException if any assignment is missing', async () => {
      try {
        const dto = {
          assignmentIds: [
            '012345678901234567890123',
            '012345678901234567890122',
          ],
        };

        await assignmentService.reorder(dto, mockUser);
        fail('Expected NotFoundException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Assignment not found');
      }
    });

    // กรณีไม่มีสิทธิ์เข้าถึง subject
    it('should throw ForbiddenException if user has no access to subject', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'No Access School',
            description: 'School without access',
            plan: 'FREE',
            logo: 'logo.png',
            country: 'Thailand',
            city: 'Bangkok',
            address: 'Forbidden Road',
            zipCode: '10000',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_test_reorder',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Forbidden Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Restricted Subject',
          classId: classroom.id,
          educationYear: '2024',
          userId: mockUser.id,
          schoolId: school.id,
          code: 'REORD001',
          description: 'Not allowed',
        });

        const a1 = await assignmentService.assignmentRepository.create({
          data: {
            title: 'A1',
            description: 'Test A1',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const a2 = await assignmentService.assignmentRepository.create({
          data: {
            title: 'A2',
            description: 'Test A2',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
          },
        });

        const dto = { assignmentIds: [a2.id, a1.id] };

        await assignmentService.reorder(dto, mockUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // กรณีสำเร็จ
    it('should reorder assignments successfully', async () => {
      try {
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Reorder School',
            description: 'Success reorder',
            plan: 'FREE',
            country: 'Thailand',
            logo: 'logo.png',
            city: 'Chiang Mai',
            address: 'Success Rd',
            zipCode: '50000',
            phoneNumber: '0888888888',
            stripe_customer_id: 'cus_success_reorder',
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
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Reorder Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Reorder Subject',
          educationYear: '2024',
          classId: classroom.id,
          userId: mockUser.id,
          schoolId: school.id,
          code: 'REORD002',
          description: 'For reorder test',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          status: 'ACCEPT',
          role: 'TEACHER',
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          photo: mockUser.photo,
          phone: mockUser.phone,
          blurHash: 'xyz',
        });

        const a1 = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Assignment 1',
            description: 'First one',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
            order: 1,
          },
        });

        const a2 = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Assignment 2',
            description: 'Second one',
            subjectId: subject.id,
            schoolId: school.id,
            type: 'Assignment',
            beginDate: new Date(),
            status: 'Published',
            order: 2,
          },
        });

        const dto = { assignmentIds: [a2.id, a1.id] };
        const reordered = await assignmentService.reorder(dto, mockUser);

        expect(reordered).toBeDefined();
        expect(reordered.length).toBe(2);
        expect(reordered[0].id).toBe(a2.id);
        expect(reordered[0].order).toBe(1);
        expect(reordered[1].id).toBe(a1.id);
        expect(reordered[1].order).toBe(2);
      } catch (error) {
        throw error;
      }
    });
  });

  /////////////////////////////// exportExcel ////////////////////////////

  describe('exportExcel', () => {
    it('should return base64 Excel file for valid subject and user', async () => {
      try {
        // 1. สร้างโรงเรียนและผู้ใช้
        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Export School',
            description: 'Export test',
            plan: 'FREE',
            country: 'Thailand',
            city: 'Bangkok',
            address: '123 Export Rd',
            zipCode: '10000',
            logo: 'logo.png',
            phoneNumber: '0999999999',
            stripe_customer_id: 'cus_export01',
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
          role: 'TEACHER',
          status: 'ACCEPT',
        });

        // 2. สร้างคลาส ห้องเรียน และวิชา
        const classroom = await classroomService.classRepository.create({
          title: 'Export Class',
          level: 'UG',
          schoolId: school.id,
          userId: mockUser.id,
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Export Subject',
          description: 'Export excel test',
          schoolId: school.id,
          classId: classroom.id,
          userId: mockUser.id,
          educationYear: '2024',
          code: 'EXP001',
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: mockUser.id,
          subjectId: subject.id,
          schoolId: school.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          phone: mockUser.phone,
          photo: mockUser.photo,
          role: 'TEACHER',
          status: 'ACCEPT',
          blurHash: 'xyz',
        });

        // 3. Assignment + GradeRule
        const assignment = await assignmentService.assignmentRepository.create({
          data: {
            title: 'Final Exam',
            description: 'Final test',
            type: 'Assignment',
            subjectId: subject.id,
            schoolId: school.id,
            beginDate: new Date(),
            status: 'Published',
            maxScore: 100,
            weight: 100,
          },
        });

        const grade = await gradeService.gradeRepository.create({
          data: {
            subjectId: subject.id,
            schoolId: school.id,
            gradeRules: JSON.stringify([
              { min: 80, max: 100, grade: 'A' },
              { min: 70, max: 79, grade: 'B' },
              { min: 60, max: 69, grade: 'C' },
              { min: 50, max: 59, grade: 'D' },
              { min: 0, max: 49, grade: 'F' },
            ]),
          },
        });

        // 4. Student + StudentOnSubject + StudentOnAssignment
        const student = await studentService.studentRepository.create({
          title: 'นาย',
          firstName: 'ทดสอบ',
          lastName: 'ระบบ',
          photo: 'test.jpg',
          number: '01',
          schoolId: school.id,
          classId: classroom.id,
          blurHash: 'blur',
        });

        const studentOnSubject =
          await studentOnSubjectService.studentOnSubjectRepository.findFirst({
            where: {
              studentId: student.id,
              subjectId: subject.id,
            },
          });

        const studentOnAssignment =
          await studentOnAssignmentService.studentOnAssignmentRepository.getByStudentIdAndAssignmentId(
            {
              studentId: student.id,
              assignmentId: assignment.id,
            },
          );

        // 5. Call exportExcel
        const result = await assignmentService.exportExcel(
          subject.id,
          mockUser,
        );

        // 6. ตรวจสอบผลลัพธ์
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result).toMatch(
          /^data:application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,/,
        );
      } catch (error) {
        throw error;
      }
    });
  });
});
