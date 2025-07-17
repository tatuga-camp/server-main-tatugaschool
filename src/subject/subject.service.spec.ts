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
  CreateSubjectDto,
  GetSubjectByIdDto,
  UpdateSubjectDto,
  DeleteSubjectDto,
} from './dto';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { SubscriptionService } from '../subscription/subscription.service';

describe('Subject Service', () => {
  let subjectService: SubjectService;
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
  let subscriptionService: SubscriptionService;

  subscriptionService = new SubscriptionService(stripeService, schoolService);

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

  const attendanceStatusListService = new AttendanceStatusListService(
    prismaService,
    teacherOnSubjectService,
  );

  beforeEach(async () => {
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
  });

  /////////////////////////////// Create Subject ////////////////////////////

  describe('createSubject', () => {
    // ทดสอบกรณีสร้างวิชาได้สำเร็จ หาก user เป็น admin และ classroom อยู่ในโรงเรียนเดียวกัน
    it('should create subject successfully if user is admin and class belongs to the school', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Admin',
          lastName: 'Subject',
          email: 'admin.subject@example.com',
          phone: '0800000000',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Math School',
            description: 'Test school',
            phoneNumber: '0111111111',
            address: 'School Rd',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Bangkok',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject',
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
          blurHash: 'abc',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ประถมศึกษาปีที่ 6',
          schoolId: school.id,
          userId: user.id,
          description: 'คณิตศาสตร์พื้นฐาน',
        });

        await studentService.studentRepository.create({
          title: 'เด็กชาย',
          firstName: 'สมปอง',
          lastName: 'เรียนดี',
          photo: 'https://example.com/photo.jpg',
          number: '01',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'abc123',
        });

        const dto: CreateSubjectDto = {
          title: 'วิชาคณิตศาสตร์',
          educationYear: '1/2025',
          description: 'เรียนเกี่ยวกับคณิตศาสตร์พื้นฐาน',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        const result = await subjectService.createSubject(dto, user);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.title).toBe(dto.title);
        expect(result.educationYear).toBe('1/2025');
        expect(result.description).toBe(dto.description);
        expect(result.schoolId).toBe(dto.schoolId);
        expect(result.classId).toBe(dto.classId);
        expect(result.userId).toBe(user.id);
        expect(result.backgroundImage).toBe(dto.backgroundImage);
      } catch (error) {
        throw error;
      }
    });

    // ทดสอบกรณีโยน NotFoundException หากหาโรงเรียนไม่เจอจาก schoolId
    it('should throw NotFoundException if school not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Tester',
          lastName: 'NoSchool',
          email: 'noschool@test.com',
          phone: '0801111111',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const dto: CreateSubjectDto = {
          title: 'วิชาไม่มีโรงเรียน',
          educationYear: '1/2025',
          description: 'ไม่เจอโรงเรียน',
          schoolId: '000000000000000000000000',
          classId: '000000000000000000000000',
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('School not found');
      }
    });

    // ทดสอบกรณีโยน NotFoundException หากหา classId ไม่เจอในระบบ
    it('should throw NotFoundException if class not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Tester',
          lastName: 'NoClass',
          email: 'noclass@test.com',
          phone: '0802222222',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'NoClass School',
            description: 'ทดสอบไม่เจอคลาส',
            phoneNumber: '0222222222',
            address: 'NoClass St.',
            zipCode: '50000',
            country: 'Thailand',
            city: 'Chiang Mai',
            logo: 'noclass.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_noclass',
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
          blurHash: 'xxx',
        });

        const dto: CreateSubjectDto = {
          title: 'วิชาประวัติศาสตร์',
          educationYear: '1/2025',
          description: 'ไม่มีคลาส',
          schoolId: school.id,
          classId: '000000000000000000000000',
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Class not found');
      }
    });

    // ทดสอบกรณีโยน ForbiddenException หาก user ไม่ได้เป็นสมาชิกของโรงเรียนนั้นเลย (ไม่มี memberOnSchool )
    it('should throw ForbiddenException if user is not a member of the school (Empty memberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Not',
          lastName: 'Member',
          email: 'notmember@test.com',
          phone: '0803333333',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Blocked School',
            description: 'ไม่ใช่สมาชิก',
            phoneNumber: '0333333333',
            address: 'Blocked Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'Chiang Rai',
            logo: 'blocked.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_blocked',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.5/1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนทั่วไป',
        });

        const dto: CreateSubjectDto = {
          title: 'วิชาศิลปะ',
          educationYear: '1/2025',
          description: 'ไม่มีสิทธิ์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });

    // ทดสอบกรณีโยน ForbiddenException หาก user มีสถานะเป็นสมาชิกโรงเรียน แต่ status !== 'ACCEPT'
    it('should throw ForbiddenException if user is not a member of the school (Status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Not',
          lastName: 'Member',
          email: 'notmember1@test.com',
          phone: '0803333333',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Blocked School1',
            description: 'ไม่ใช่สมาชิก',
            phoneNumber: '0333333334',
            address: 'Blocked Rd',
            zipCode: '50000',
            country: 'Thailand',
            city: 'Chiang Rai',
            logo: 'blocked.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_blocked1',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.5/1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนทั่วไป',
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
          blurHash: 'xxx',
        });

        const dto: CreateSubjectDto = {
          title: 'วิชาศิลปะ',
          educationYear: '1/2025',
          description: 'ไม่มีสิทธิ์',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);

        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("You're not a member of this school");
      }
    });

    // ทดสอบกรณีโยน ForbiddenException หาก classroom ไม่ได้อยู่ในโรงเรียนที่ส่งมา (schoolId ไม่ตรงกัน)
    it("should throw ForbiddenException if class doesn't belong to the school", async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Mismatch',
          lastName: 'Class',
          email: 'mismatch@test.com',
          phone: '0804444444',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const schoolA = await schoolService.schoolRepository.create({
          data: {
            title: 'School A',
            description: 'เจ้าของโรงเรียน A',
            phoneNumber: '0444444444',
            address: 'A Road',
            zipCode: '50000',
            country: 'Thailand',
            city: 'Khon Kaen',
            logo: 'schoolA.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_schoola',
          },
        });

        const schoolB = await schoolService.schoolRepository.create({
          data: {
            title: 'School B',
            description: 'คลาสอยู่โรงเรียน B',
            phoneNumber: '0555555555',
            address: 'B Street',
            zipCode: '50000',
            country: 'Thailand',
            city: 'Bangkok',
            logo: 'schoolB.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_schoolb',
          },
        });

        await memberOnSchoolService.memberOnSchoolRepository.create({
          userId: user.id,
          schoolId: schoolA.id,
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
          title: 'Class In B',
          level: 'ป.4',
          schoolId: schoolB.id,
          userId: user.id,
          description: 'อยู่คนละโรงเรียน',
        });

        const dto: CreateSubjectDto = {
          title: 'ผิดโรงเรียน',
          educationYear: '1/2025',
          description: 'ห้องเรียนไม่ตรงโรงเรียน',
          schoolId: schoolA.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("Class doesn't belong to this school");
      }
    });

    // ทดสอบกรณีโยน ForbiddenException หากจำนวนวิชาในโรงเรียนเกิน limit ที่กำหนดไว้ (ตาม plan เช่น FREE = 3 วิชา)
    it('should throw ForbiddenException if subject number exceeds school limit', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Limit',
          lastName: 'Exceeded',
          email: 'limit@test.com',
          phone: '0805555555',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Limit School',
            description: 'Test subject limit',
            phoneNumber: '0555555555',
            address: 'Limit Road',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Loei',
            logo: 'limit.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_limit',
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
          blurHash: 'abc',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.1/1',
          level: 'ป.1',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องเรียนเด็กเล็ก',
        });

        // เพิ่ม subject จนเกิน limit (FREE plan = 3)
        for (let i = 0; i < 3; i++) {
          await subjectService.subjectRepository.createSubject({
            title: `วิชา ${i + 1}`,
            educationYear: '1/2025',
            schoolId: school.id,
            classId: classroom.id,
            userId: user.id,
            description: 'ทดสอบเกิน limit',
            code: `subjectcode ${i + 1}`,
            backgroundImage: 'https://example.com/bg.png',
            blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          });
        }

        const dto: CreateSubjectDto = {
          title: 'วิชาเกิน',
          educationYear: '1/2025',
          description: 'ทดสอบเกิน limit',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Subject number has reached limit');
      }
    });

    // ทดสอบกรณีสร้าง subject ได้ แม้ใน class จะไม่มีนักเรียน (จะไม่เรียก createMany ใน studentOnSubject)
    it('should allow creating subject with empty student list (no createMany call)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Empty',
          lastName: 'Class',
          email: 'emptyclass@test.com',
          phone: '0806666666',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Empty School',
            description: 'No students here',
            phoneNumber: '0666666666',
            address: 'Ghost Rd',
            zipCode: '42000',
            country: 'Thailand',
            city: 'Udon',
            logo: 'empty.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_empty',
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
          blurHash: 'blur123',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.3/1',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องไม่มีนักเรียน',
        });

        const dto: CreateSubjectDto = {
          title: 'วิชาว่างเปล่า',
          educationYear: '1/2025',
          description: 'ไม่มีนักเรียนเลย',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        const result = await subjectService.createSubject(dto, user);

        expect(result).toBeDefined();
        expect(result.title).toBe(dto.title);
        expect(result.schoolId).toBe(school.id);
      } catch (error) {
        throw error;
      }
    });

    // ทดสอบกรณีระบบ rollback และลบ subject ทิ้งหากขั้นตอนใดในกระบวนการสร้างล้มเหลว (ทดสอบด้วยการ mock ให้ createAttendanceTable ล้ม)
    it('should cleanup subject if any part of creation pipeline fails', async () => {
      let school;
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Rollback',
          lastName: 'Fail',
          email: 'rollback@test.com',
          phone: '0807777777',
          photo: 'photo.png',
          password: 'test1234',
          provider: 'LOCAL',
        });

        school = await schoolService.schoolRepository.create({
          data: {
            title: 'Fail School',
            description: 'ล้มแล้วลบ',
            phoneNumber: '0777777777',
            address: 'Fail St.',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Nakhon Ratchasima',
            logo: 'fail.png',
            plan: 'PREMIUM',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_fail',
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
          blurHash: 'zzz',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.4/2',
          level: 'ป.4',
          schoolId: school.id,
          userId: user.id,
          description: 'ห้องจะ fail',
        });

        // Mock ให้ fail ตรง createAttendanceTable
        jest
          .spyOn(attendanceTableService, 'createAttendanceTable')
          .mockImplementationOnce(() => {
            throw new Error('Force fail attendance creation');
          });

        const dto: CreateSubjectDto = {
          title: 'วิชาที่ล้มเหลว',
          educationYear: '1/2025',
          description: 'ไม่สำเร็จต้องลบ subject',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: 'https://example.com/bg.png',
        };

        await subjectService.createSubject(dto, user);
        fail('Expected Error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Force fail attendance creation');

        // ใช้ school.id ที่แยกไว้ ไม่ใช้จาก error
        const subjects = await subjectService.subjectRepository.findMany({
          where: { schoolId: school.id },
        });

        const found = subjects.find((s) => s.title === 'วิชาที่ล้มเหลว');
        expect(found).toBeUndefined(); // คาดว่า subject ถูกลบออกจากระบบแล้ว
      }
    });
  });

  /////////////////////////////// Get Subject By Subject ID ////////////////////////////

  describe('getSubjectById', () => {
    // ทดสอบกรณี: เป็นครู และมีสิทธิ์ในวิชานั้น → ควรได้ subject กลับมา
    it('should return subject if teacher has access', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: 'teacher1@test.com',
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'School A',
            description: '',
            phoneNumber: '0900000000',
            address: 'Somewhere',
            zipCode: '40000',
            country: 'Thailand',
            city: 'Udon Thani',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test',
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
          blurHash: 'zzz',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Test Room',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: 'Math Desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: 'subjectCode101',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          order: 0,
          userId: user.id,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          subjectId: subject.id,
          userId: user.id,
          schoolId: school.id,
          status: Status.ACCEPT,
          role: MemberRole.TEACHER,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          photo: user.photo,
          blurHash: user.blurHash,
          phone: user.phone,
        });

        const dto: GetSubjectByIdDto = { subjectId: subject.id };

        const result = await subjectService.getSubjectById(
          dto,
          user,
          undefined,
        );
        expect(result).toBeDefined();
        expect(result.id).toBe(subject.id);
      } catch (error) {
        throw error;
      }
    });

    // ทดสอบกรณี: เป็นนักเรียนที่อยู่ในวิชานั้น → ควรได้ subject กลับมา
    it('should return subject if student is assigned', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: 'teacher2@test.com',
          phone: '0800000022',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Student School',
            description: '',
            phoneNumber: '0999999999',
            address: 'Student Street',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Surin',
            logo: 's.png',
            plan: 'PREMIUM',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_student',
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
          blurHash: 'zzz',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.3/1',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: 'เด็กน่อย ป.3/1',
        });

        const student = await studentService.studentRepository.create({
          title: 'mr',
          firstName: 'Student',
          lastName: 'A',
          photo: 'https://example.com/photo.jpg',
          number: '12',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Science',
          educationYear: '2/2025',
          description: 'sci',
          schoolId: school.id,
          classId: classroom.id,
          userId: user.id,
          code: 'subjectCode102',
          backgroundImage: 'https://example.com/bg.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          subjectId: subject.id,
          userId: user.id,
          schoolId: school.id,
          status: Status.ACCEPT,
          role: MemberRole.TEACHER,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          photo: user.photo,
          blurHash: user.blurHash,
          phone: user.phone,
        });

        await studentOnSubjectService.studentOnSubjectRepository.createStudentOnSubject(
          {
            title: student.title,
            firstName: student.firstName,
            lastName: student.lastName,
            number: '01',
            photo: student.photo,
            blurHash: student.blurHash,
            subjectId: subject.id,
            studentId: student.id,
            classId: classroom.id,
            schoolId: school.id,
          },
        );

        const dto: GetSubjectByIdDto = { subjectId: subject.id };

        const result = await subjectService.getSubjectById(
          dto,
          undefined,
          student,
        );
        expect(result).toBeDefined();
        expect(result.id).toBe(subject.id);
      } catch (error) {
        throw error;
      }
    });

    // ทดสอบกรณี: เป็นนักเรียน แต่ไม่ได้อยู่ในวิชานั้น → ควรโยน ForbiddenException
    it('should throw ForbiddenException if student not in subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: 'teacher3@test.com',
          phone: '0800000023',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Student School',
            description: '',
            phoneNumber: '0999999999',
            address: 'Student Street',
            zipCode: '30000',
            country: 'Thailand',
            city: 'Surin',
            logo: 's.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_student11',
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
          blurHash: 'zzz',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.3/1',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: 'เด็กน่อย ป.3/1',
        });

        const student = await studentService.studentRepository.create({
          title: 'mr',
          firstName: 'Student',
          lastName: 'B',
          photo: 'https://example.com/photo.jpg',
          number: '11',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Science',
          educationYear: '1/2025',
          description: 'sci',
          schoolId: school.id,
          classId: classroom.id,
          userId: user.id,
          code: 'subjectCode103',
          backgroundImage: 'https://example.com/bg.png',
          blurHash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
          order: 0,
        });

        const dto: GetSubjectByIdDto = { subjectId: subject.id };

        await subjectService.getSubjectById(dto, undefined, student);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe("Student doesn't belong to this subject");
      }
    });
  });

  /////////////////////////////// Get Subject By School ID ////////////////////////////

  describe('getBySchoolId', () => {
    // กรณี: มีสิทธิ์ในโรงเรียนและมี subject อยู่ → ควรได้ข้อมูล subject + teachers + classroom
    it('should return subjects with teachers and classroom if user has access', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Access',
          lastName: 'Teacher',
          email: 'access@test.com',
          phone: '0810000000',
          password: 'test1234',
          photo: 'access.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Access School',
            phoneNumber: '0999999999',
            address: 'Access Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_testaccess',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.1/1',
          level: 'ป.1',
          schoolId: school.id,
          userId: user.id,
          description: 'Basic',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Thai',
          educationYear: '1/2025',
          description: 'Thai Desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: 'sub101',
          blurHash: 'blurhash1',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          subjectId: subject.id,
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: 'blur',
        });

        const dto = {
          schoolId: school.id,
          educationYear: subject.educationYear,
        };

        const result = await subjectService.getBySchoolId(dto, user);

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);

        const target = result.find((s) => s.id === subject.id);
        expect(target).toBeDefined();
        expect(target?.class.id).toBe(classroom.id);

        const teacher = target?.teachers.find((t) => t.userId === user.id);
        expect(teacher).toBeDefined();
        expect(teacher?.role).toBe('ADMIN');
      } catch (error) {
        throw error;
      }
    });

    // กรณี: ไม่มีสิทธิ์ในโรงเรียน → ควรโยน ForbiddenException
    it('should throw ForbiddenException if user has no access to school', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Access',
          lastName: 'Teacher',
          email: 'blocked@test.com',
          phone: '0811111111',
          password: 'test1234',
          photo: 'blocked.png',
          provider: 'LOCAL',
        });

        const user_no_access = await userService.userRepository.createUser({
          firstName: 'Blocked',
          lastName: 'Teacher',
          email: 'blocked123@test.com',
          phone: '0811111111',
          password: 'test1234',
          photo: 'blocked.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Access School',
            phoneNumber: '0999999999',
            address: 'Access Rd.',
            zipCode: '30000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'logo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_no_access',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.1/2',
          level: 'ป.1',
          schoolId: school.id,
          userId: user.id,
          description: 'Basic',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Thai',
          educationYear: '2/2025',
          description: 'Thai Desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: 'sub102',
          blurHash: 'blurhash1',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          subjectId: subject.id,
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: 'blur',
        });

        const dto = {
          schoolId: school.id,
          educationYear: subject.educationYear,
        };

        await subjectService.getBySchoolId(dto, user_no_access);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Access denied');
      }
    });
  });

  /////////////////////////////// Get Subjects That Student Belong To ////////////////////////////

  describe('getSubjectsThatStudentBelongTo', () => {
    // กรณี: student เข้าถึงข้อมูลของตัวเอง → ได้ subject ตาม educationYear
    it('should return subjects that student belongs to if student accesses their own data', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: 'teacher444@test.com',
          phone: '0800000023',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_student',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.3/1',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: 'Classroom Desc',
        });

        const studentUser = await studentService.studentRepository.create({
          title: 'mr',
          firstName: 'Student',
          lastName: 'B',
          photo: 'https://example.com/photo.jpg',
          number: '11',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math Desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: 'sub-math66',
          blurHash: 'blur-subject',
          userId: user.id,
          order: 0,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          subjectId: subject.id,
          userId: user.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: 'blur',
        });

        await studentOnSubjectService.studentOnSubjectRepository.createStudentOnSubject(
          {
            title: studentUser.title,
            firstName: studentUser.firstName,
            lastName: studentUser.lastName,
            number: '02',
            photo: studentUser.photo,
            blurHash: studentUser.blurHash,
            subjectId: subject.id,
            studentId: studentUser.id,
            classId: classroom.id,
            schoolId: school.id,
          },
        );

        const dto = {
          studentId: studentUser.id,
          educationYear: '2/2025',
        };

        const result = await subjectService.getSubjectsThatStudentBelongTo(
          dto,
          studentUser,
        );

        expect(result).toBeDefined();
        const found = result.find((s) => s.id === subject.id);
        expect(found).toBeDefined();
        expect(found?.educationYear).toBe('2/2025');
      } catch (error) {
        throw error;
      }
    });

    // กรณี: student id ไม่พบ → ควรโยน NotFoundException
    it('should throw NotFoundException if student is not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: 'teacher345@test.com',
          phone: '0800000023',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'School Address',
            zipCode: '12345',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_999',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.2/1',
          level: 'ป.2',
          schoolId: school.id,
          userId: user.id,
          description: 'Desc',
        });

        const studentUser = await studentService.studentRepository.create({
          title: 'mr',
          firstName: 'Ghost',
          lastName: 'Student',
          photo: 'https://example.com/photo.jpg',
          number: '999',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'blur',
        });

        const dto = {
          studentId: '123456789012345678901234', // ไม่มีจริง
          educationYear: '2/2025',
        };

        await subjectService.getSubjectsThatStudentBelongTo(dto, studentUser);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Student not found');
      }
    });

    // กรณี: student เข้าถึงข้อมูลของคนอื่น → ควรโยน ForbiddenException
    it('should throw ForbiddenException if student tries to access another student data', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: 'teacher555@test.com',
          phone: '0800000023',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'School Address',
            zipCode: '12345',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_diff',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.2/1',
          level: 'ป.2',
          schoolId: school.id,
          userId: user.id,
          description: 'Desc',
        });

        const realStudent = await studentService.studentRepository.create({
          title: 'mr',
          firstName: 'Real',
          lastName: 'Student',
          photo: 'real.png',
          number: '01',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'blur1',
        });

        const fakeStudent = await studentService.studentRepository.create({
          title: 'mr',
          firstName: 'Fake',
          lastName: 'Student',
          photo: 'fake.png',
          number: '02',
          classId: classroom.id,
          schoolId: school.id,
          blurHash: 'blur2',
        });

        const dto = {
          studentId: realStudent.id,
          educationYear: '2/2025',
        };

        await subjectService.getSubjectsThatStudentBelongTo(dto, fakeStudent);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toBe('Forbidden access');
      }
    });
  });

  /////////////////////////////// Get Subject With Teacher And Student ////////////////////////////

  describe('getSubjectWithTeacherAndStudent', () => {
    // กรณี: ดึงข้อมูล subject สำเร็จด้วย subjectId
    it('should return subject with students and teachers using subjectId', async () => {
      const user = await userService.userRepository.createUser({
        firstName: 'Teacher',
        lastName: 'Test',
        email: 'teachertest22@gmail.com',
        phone: '0800000001',
        password: 'test1234',
        photo: 'teacher.png',
        provider: 'LOCAL',
      });

      const school = await schoolService.schoolRepository.create({
        data: {
          title: 'Test School',
          phoneNumber: '0999999999',
          address: 'School Address',
          zipCode: '40000',
          city: 'Bangkok',
          country: 'Thailand',
          description: '',
          logo: 'logo.png',
          plan: 'FREE',
          billingManagerId: user.id,
          stripe_customer_id: 'cus_test_001',
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
        blurHash: 'blur',
      });

      const classroom = await classroomService.classRepository.create({
        title: 'ป.4/1',
        level: 'ป.4',
        schoolId: school.id,
        userId: user.id,
        description: 'Test class',
      });

      const student = await studentService.studentRepository.create({
        title: 'mr',
        firstName: 'Student',
        lastName: 'A',
        photo: 'https://example.com/photo.jpg',
        number: '01',
        classId: classroom.id,
        schoolId: school.id,
        blurHash: 'blurhash',
      });

      const subject = await subjectService.subjectRepository.createSubject({
        title: 'English',
        educationYear: '2/2025',
        description: 'English course',
        schoolId: school.id,
        classId: classroom.id,
        backgroundImage: '',
        code: 'ENG-890',
        blurHash: 'blurhash-subject',
        userId: user.id,
        order: 1,
      });

      await teacherOnSubjectService.teacherOnSubjectRepository.create({
        subjectId: subject.id,
        userId: user.id,
        schoolId: school.id,
        role: 'TEACHER',
        status: 'ACCEPT',
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        blurHash: 'blurhash',
      });

      await studentOnSubjectService.studentOnSubjectRepository.createStudentOnSubject(
        {
          title: student.title,
          firstName: student.firstName,
          lastName: student.lastName,
          number: student.number,
          photo: student.photo,
          blurHash: student.blurHash,
          subjectId: subject.id,
          studentId: student.id,
          classId: classroom.id,
          schoolId: school.id,
        },
      );

      const dto = { subjectId: subject.id };
      const result = await subjectService.getSubjectWithTeacherAndStudent(dto);

      expect(result).toBeDefined();
      expect(result.id).toBe(subject.id);
      expect(result.teacherOnSubjects.length).toBe(1);
      expect(result.studentOnSubjects.length).toBe(1);
    });

    // กรณี: ดึงข้อมูล subject สำเร็จด้วย code
    it('should return subject with students and teachers using code', async () => {
      const code = 'SCI-888';

      const user = await userService.userRepository.createUser({
        firstName: 'Teacher2',
        lastName: 'Test',
        email: 'teachertest2345@gmail.com',
        phone: '0800000002',
        password: 'test1234',
        photo: 'teacher2.png',
        provider: 'LOCAL',
      });

      const school = await schoolService.schoolRepository.create({
        data: {
          title: 'Another School',
          phoneNumber: '0888888888',
          address: 'Another Road',
          zipCode: '50000',
          city: 'Chiang Mai',
          country: 'Thailand',
          description: '',
          logo: 'logo2.png',
          plan: 'FREE',
          billingManagerId: user.id,
          stripe_customer_id: 'cus_test_002',
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
        blurHash: 'blur',
      });

      const classroom = await classroomService.classRepository.create({
        title: 'ป.5/1',
        level: 'ป.5',
        schoolId: school.id,
        userId: user.id,
        description: 'Another class',
      });

      const subject = await subjectService.subjectRepository.createSubject({
        title: 'Science',
        educationYear: '1/2025',
        description: 'Science course',
        schoolId: school.id,
        classId: classroom.id,
        backgroundImage: '',
        code: code,
        blurHash: 'blurhash-science',
        userId: user.id,
        order: 2,
      });

      await teacherOnSubjectService.teacherOnSubjectRepository.create({
        subjectId: subject.id,
        userId: user.id,
        schoolId: school.id,
        role: 'TEACHER',
        status: 'ACCEPT',
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        blurHash: 'blurhash',
      });

      const dto = { code };
      const result = await subjectService.getSubjectWithTeacherAndStudent(dto);

      expect(result).toBeDefined();
      expect(result.code).toBe(code);
      expect(result.teacherOnSubjects.length).toBe(1);
      expect(result.studentOnSubjects.length).toBe(0); // ไม่มี student ก็ได้
    });

    // กรณี: ไม่พบ subject ด้วย subjectId → ควรโยน NotFoundException
    it('should throw NotFoundException if subjectId not found', async () => {
      try {
        const dto = { subjectId: '123456789012345678901234' };
        await subjectService.getSubjectWithTeacherAndStudent(dto);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject not found');
      }
    });

    // กรณี: ไม่พบ subject ด้วย code → ควรโยน NotFoundException
    it('should throw NotFoundException if code not found', async () => {
      try {
        const dto = { code: 'invalid-code' };
        await subjectService.getSubjectWithTeacherAndStudent(dto);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject not found');
      }
    });
  });

  /////////////////////////////// Update Subject ////////////////////////////

  describe('updateSubject', () => {
    // กรณี: อัปเดตข้อมูลสำเร็จ
    it('should update subject successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject888',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
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

        const dto: UpdateSubjectDto = {
          query: { subjectId: subject.id },
          body: {
            title: 'Updated Math',
            description: 'Updated Description',
            backgroundImage: 'new-img.png',
            educationYear: '1/2026',
          },
        };

        const updated = await subjectService.updateSubject(dto, user);
        expect(updated).toBeDefined();
        expect(updated.title).toBe('Updated Math');
        expect(updated.educationYear).toBe('1/2026');
        expect(updated.description).toBe('Updated Description');
        expect(updated.backgroundImage).toBe('new-img.png');
      } catch (error) {
        throw error;
      }
    });

    // กรณี: ไม่พบ subject → ควร throw NotFoundException
    it('should throw NotFoundException if subject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Fake',
          lastName: 'User',
          email: `fake-${Date.now()}@test.com`,
          phone: '0801234567',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: UpdateSubjectDto = {
          query: { subjectId: '123456789012345678901234' },
          body: { title: 'Should Fail' },
        };

        await subjectService.updateSubject(dto, user);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject Not Found');
      }
    });

    // กรณี: ไม่ใช่สมาชิกหรือครูในวิชา → ควร throw ForbiddenException
    it("should throw ForbiddenException if user isn't member or teacher on subject", async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Not',
          lastName: 'Member',
          email: `not-member-${Date.now()}@test.com`,
          phone: '0809999999',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Another School',
            phoneNumber: '0999999998',
            address: 'Another Road',
            zipCode: '50000',
            city: 'Bangkok',
            country: 'Thailand',
            description: '',
            logo: 'school2.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_fail_test',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.2/1',
          level: 'ป.2',
          schoolId: school.id,
          userId: user.id,
          description: 'Science Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Science',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SCI-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const dto: UpdateSubjectDto = {
          query: { subjectId: subject.id },
          body: { title: 'Fail Update' },
        };

        await subjectService.updateSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    // กรณี: คลาสถูกปิด (readonly) → ห้ามอัปเดต
    it('should throw ForbiddenException if class is achieved (readonly)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'ReadOnly',
          lastName: 'Teacher',
          email: `readonly-${Date.now()}@test.com`,
          phone: '0808888888',
          password: 'test1234',
          photo: '',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'ReadOnly School',
            phoneNumber: '0900000000',
            address: 'ReadOnly Rd',
            zipCode: '12345',
            city: 'Udon',
            country: 'Thailand',
            description: '',
            logo: 'photo.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_readonly',
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
          title: 'ReadOnly Class',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'ReadOnly Class',
        });

        await classroomService.classRepository.update({
          where: {
            id: classroom.id,
          },
          data: {
            title: 'Updated Title',
            isAchieved: true,
          },
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'History',
          educationYear: '1/2025',
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

        const dto: UpdateSubjectDto = {
          query: { subjectId: subject.id },
          body: { title: 'Should Not Update' },
        };

        await subjectService.updateSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('read-only');
      }
    });
  });

  /////////////////////////////// Reorder Subjects ////////////////////////////

  describe('reorderSubjects', () => {
    // กรณี: เรียงลำดับ subject สำเร็จ
    it('should reorder subjects successfully', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'A',
          email: `teacher-${Date.now()}@test.com`,
          phone: '0800000001',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Test School',
            phoneNumber: '0999999999',
            address: 'Main Rd',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_reorder',
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
          title: 'ห้อง 1',
          level: 'ป.5',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject1 = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `CODE1-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const subject2 = await subjectService.subjectRepository.createSubject({
          title: 'Science',
          educationYear: '1/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `CODE2-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 2,
        });

        const dto = {
          subjectIds: [subject2.id, subject1.id], // เปลี่ยนลำดับใหม่
        };

        const result = await subjectService.reorderSubjects(dto, user);

        expect(result).toBeDefined();
        expect(result.length).toBe(2);
        const updatedMath = result.find((s) => s.id === subject1.id);
        const updatedScience = result.find((s) => s.id === subject2.id);
        expect(updatedMath?.order).toBe(1);
        expect(updatedScience?.order).toBe(0);
      } catch (error) {
        throw error;
      }
    });

    // กรณี: ถ้า subject ที่สุ่มหาไม่เจอ → ควร throw NotFoundException
    it('should throw NotFoundException if random subject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Random',
          lastName: 'Missing',
          email: `missing-${Date.now()}@test.com`,
          phone: '0800000011',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto = {
          subjectIds: ['987654321098765432109876', '123456789012345678901234'],
        };

        await subjectService.reorderSubjects(dto, user);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toBe('Subject not found');
      }
    });

    // กรณี: ถ้า user ไม่ได้เป็นสมาชิกโรงเรียน → ควร throw ForbiddenException
    it('should throw ForbiddenException if user is not a member of the school (Empty memberOnSchool)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Forbidden',
          lastName: 'User',
          email: `forbidden-${Date.now()}@test.com`,
          phone: '0800000022',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden School',
            phoneNumber: '0900000000',
            address: 'Nowhere',
            zipCode: '99999',
            city: 'NoCity',
            country: 'Nowhere',
            description: '',
            logo: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_forbid',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'Forbidden Class',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Forbidden Subject',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `FORBID-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const dto = {
          subjectIds: [subject.id],
        };

        await subjectService.reorderSubjects(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });
    // กรณี: ถ้า user ไม่ได้เป็นสมาชิกโรงเรียน → ควร throw ForbiddenException
    it('should throw ForbiddenException if user is not a member of the school (status !== ACCEPT)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Forbidden',
          lastName: 'User',
          email: `forbidden2-${Date.now()}@test.com`,
          phone: '0800000022',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'Forbidden School',
            phoneNumber: '0900000000',
            address: 'Nowhere',
            zipCode: '99999',
            city: 'NoCity',
            country: 'Nowhere',
            description: '',
            logo: '',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_forbid11',
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
          title: 'Forbidden Class',
          level: 'ป.3',
          schoolId: school.id,
          userId: user.id,
          description: '',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Forbidden Subject',
          educationYear: '2/2025',
          description: '',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `FORBID2-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const dto = {
          subjectIds: [subject.id],
        };

        await subjectService.reorderSubjects(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain('Access denied');
      }
    });
  });

  /////////////////////////////// Delete Subject ////////////////////////////

  describe('deleteSubject', () => {
    it('should delete subject successfully (admin-school && ADMIN on subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-01@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject_delete_01',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
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

        const dto: DeleteSubjectDto = {
          subjectId: subject.id,
        };

        await subjectService.deleteSubject(dto, user);
      } catch (error) {
        throw error;
      }
    });

    it('should throw ForbiddenException if not admin member on school (not admin-school && not ADMIN on subject)', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-02@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject_delete_02',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
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

        const dto: DeleteSubjectDto = {
          subjectId: subject.id,
        };

        await subjectService.deleteSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain(
          'Only admin of this school and admin of this subject can delete',
        );
      }
    });

    it('should throw NotFoundException if subject not found', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-03@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const dto: DeleteSubjectDto = {
          subjectId: '123456789012345678901234',
        };

        await subjectService.deleteSubject(dto, user);
        fail('Expected NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.message).toContain('Subject not found');
      }
    });

    it('should throw ForbiddenException if not member on school', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-04@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject_delete_03',
          },
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
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

        const dto: DeleteSubjectDto = {
          subjectId: subject.id,
        };
        await subjectService.deleteSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain("You're not a member of this school");
      }
    });

    it('should throw ForbiddenException if member on school status !== ACCEPT', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-05@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject_delete_05',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
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

        const dto: DeleteSubjectDto = {
          subjectId: subject.id,
        };
        await subjectService.deleteSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        console.log(error);
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain("You're not a member of this school");
      }
    });

    it('should throw ForbiddenException if not teacher on subject', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-06@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject_delete_06',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        const dto: DeleteSubjectDto = {
          subjectId: subject.id,
        };
        await subjectService.deleteSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain("You're not a teacher on this subject");
      }
    });

    it('should throw ForbiddenException if teacher on subject status !== ACCEPT', async () => {
      try {
        const user = await userService.userRepository.createUser({
          firstName: 'Teacher',
          lastName: 'Test',
          email: `teacher-delete-07@test.com`,
          phone: '0800000000',
          password: 'test1234',
          photo: 'photo.png',
          provider: 'LOCAL',
        });

        const school = await schoolService.schoolRepository.create({
          data: {
            title: 'My School',
            phoneNumber: '0999999999',
            address: 'School Road',
            zipCode: '40000',
            city: 'City',
            country: 'Thailand',
            description: '',
            logo: 'school.png',
            plan: 'FREE',
            billingManagerId: user.id,
            stripe_customer_id: 'cus_test_subject_delete_07',
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
          blurHash: 'blur',
        });

        const classroom = await classroomService.classRepository.create({
          title: 'ป.6/1',
          level: 'ป.6',
          schoolId: school.id,
          userId: user.id,
          description: 'Math Class',
        });

        const subject = await subjectService.subjectRepository.createSubject({
          title: 'Math',
          educationYear: '2/2025',
          description: 'Math desc',
          schoolId: school.id,
          classId: classroom.id,
          backgroundImage: '',
          code: `SUB-${Date.now()}`,
          blurHash: '',
          userId: user.id,
          order: 1,
        });

        await teacherOnSubjectService.teacherOnSubjectRepository.create({
          userId: user.id,
          subjectId: subject.id,
          schoolId: school.id,
          role: 'ADMIN',
          status: 'PENDDING',
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          blurHash: user.blurHash,
        });

        const dto: DeleteSubjectDto = {
          subjectId: subject.id,
        };
        await subjectService.deleteSubject(dto, user);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.message).toContain("You're not a teacher on this subject");
      }
    });
  });
});
