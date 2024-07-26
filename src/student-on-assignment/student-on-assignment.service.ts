import { GoogleStorageService } from './../google-storage/google-storage.service';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { AssignmentRepository } from './../assignment/assignment.repository';
import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { StudentOnAssignment, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStudentOnAssignmentDto,
  DeleteStudentOnAssignmentDto,
  GetStudentOnAssignmentByAssignmentIdDto,
  GetStudentOnAssignmentByStudentIdDto,
  UpdateStudentOnAssignmentDto,
} from './dto';
import { StudentOnAssignmentRepository } from './student-on-assignment.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentRepository } from '../student/student.repository';

@Injectable()
export class StudentOnAssignmentService {
  logger: Logger = new Logger(StudentOnAssignmentService.name);
  studentRepository: StudentRepository = new StudentRepository(this.prisma);
  studentOnSubjectRepository: StudentOnSubjectRepository =
    new StudentOnSubjectRepository(this.prisma, this.googleStorageService);
  studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);
  teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  memberOnSchoolRepository: MemberOnSchoolRepository =
    new MemberOnSchoolRepository(this.prisma);
  assignmentRepository: AssignmentRepository = new AssignmentRepository(
    this.prisma,
  );
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getByAssignmentId(
    dto: GetStudentOnAssignmentByAssignmentIdDto,
    user: User,
  ): Promise<StudentOnAssignment[]> {
    try {
      const assignment = await this.assignmentRepository.getAssignmentById({
        assignmentId: dto.assignmentId,
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: assignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      const studentOnAssignments =
        this.studentOnAssignmentRepository.getByAssignmentId(dto);

      return studentOnAssignments;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByStudentId(
    dto: GetStudentOnAssignmentByStudentIdDto,
    user: User,
  ): Promise<StudentOnAssignment[]> {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });
      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: student.schoolId,
            userId: user.id,
          },
        );

      if (!memberOnSchool) {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      const studentOnAssignments =
        this.studentOnAssignmentRepository.getByStudentId(dto);

      return studentOnAssignments;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: CreateStudentOnAssignmentDto,
    user: User,
  ): Promise<StudentOnAssignment> {
    try {
      const [assignment, studentOnSubject] = await Promise.all([
        this.assignmentRepository.getAssignmentById({
          assignmentId: dto.assignmentId,
        }),
        this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        }),
      ]);

      if (!assignment || !studentOnSubject) {
        throw new NotFoundException('Assignment Or StudentOnSubject not found');
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: assignment.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: assignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      const studentOnAssignment = this.studentOnAssignmentRepository.create({
        title: studentOnSubject.title,
        firstName: studentOnSubject.firstName,
        lastName: studentOnSubject.lastName,
        picture: studentOnSubject.picture,
        number: studentOnSubject.number,
        studentId: studentOnSubject.studentId,
        assignmentId: assignment.id,
        studentOnSubjectId: studentOnSubject.id,
        schoolId: studentOnSubject.schoolId,
        subjectId: studentOnSubject.subjectId,
      });
      return studentOnAssignment;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateStudentOnAssignmentDto,
    user: User,
  ): Promise<StudentOnAssignment> {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.query.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('StudentOnAssignment not found');
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: studentOnAssignment.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: studentOnAssignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }
      return await this.studentOnAssignmentRepository.update({
        query: dto.query,
        body: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteStudentOnAssignmentDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('StudentOnAssignment not found');
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: studentOnAssignment.subjectId,
        });

      const memberOnSchool =
        await this.memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId(
          {
            schoolId: studentOnAssignment.schoolId,
            userId: user.id,
          },
        );

      if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You are not allowed to access this resource',
        );
      }

      return await this.studentOnAssignmentRepository.delete({
        studentOnAssignmentId: dto.studentOnAssignmentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
