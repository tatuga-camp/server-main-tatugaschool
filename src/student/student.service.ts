import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentRepository, StudentRepositoryType } from './student.repository';
import {
  CreateManyStudentsDto,
  CreateStudentDto,
} from './dto/create-student.dto';

import { GetAllStudentsDto, GetStudentDto } from './dto/get-student.dto';
import { UsersService } from 'src/users/users.service';
import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import { MemberOnSchool, Student, User } from '@prisma/client';
import { UpdateStudentDto } from './dto/update-student.dto';
import { DeleteStudentDto } from './dto/delete-student.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StudentService {
  logger = new Logger(StudentService.name);
  studentRepository: StudentRepositoryType;
  constructor(
    private prisma: PrismaService,
    private userService: UsersService,
    private memberOnSchoolService: MemberOnSchoolService,
  ) {
    this.studentRepository = new StudentRepository(prisma);
  }

  async validateAccessMember({
    user,
    schoolId,
  }: {
    user: User;
    schoolId: string;
  }): Promise<MemberOnSchool> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException('Access denied');
      }
      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createStudent(createStudentDto: CreateStudentDto, user: User) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: createStudentDto.schoolId,
      });

      const request = { data: createStudentDto };
      return this.studentRepository.create(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createManyStudents(
    createManyStudentsDto: CreateManyStudentsDto,
    user: User,
  ) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: createManyStudentsDto.students[0].schoolId,
      });

      const request = { data: createManyStudentsDto };
      return this.studentRepository.createMany(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentById(
    getStudentDto: GetStudentDto,
    userId: string,
  ): Promise<Student> {
    try {
      const user = await this.userService.getUserById(userId);

      const student = await this.studentRepository.findById({
        studentId: getStudentDto.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.validateAccessMember({
        user: user,
        schoolId: student.schoolId,
      });

      return student;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllStudents(getAllStudentsDto: GetAllStudentsDto, user: User) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: getAllStudentsDto.schoolId,
      });

      const request = { classId: getAllStudentsDto.classId };
      return this.studentRepository.findAll(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateStudent(updateStudentDto: UpdateStudentDto, user: User) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: updateStudentDto.body.schoolId,
      });

      const request = {
        studentId: updateStudentDto.query.studentId,
        data: updateStudentDto,
      };
      return this.studentRepository.update(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteStudent(deleteStudentDto: DeleteStudentDto, user: User) {
    try {
      const student = await this.studentRepository.findById({
        studentId: deleteStudentDto.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: student.schoolId,
      });

      return this.studentRepository.delete({
        studentId: deleteStudentDto.studentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
