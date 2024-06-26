import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StudentRepository,
  StudentRepositoryType,
} from './repository/student.repository';
import {
  CreateManyStudentsDto,
  CreateStudentDto,
} from './dto/create-student.dto';

import { GetAllStudentsDto, GetStudentDto } from './dto/get-student.dto';
import { UsersService } from 'src/users/users.service';
import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import { MemberOnSchool, User } from '@prisma/client';
import { UpdateStudentDto } from './dto/update-student.dto';
import { DeleteStudentDto } from './dto/delete-student.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StudentService {
  studentRepository: StudentRepositoryType;
  constructor(
    private userService: UsersService,
    private memberOnSchoolService: MemberOnSchoolService,
    private prisma: PrismaService,
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
  }

  async createStudent(createStudentDto: CreateStudentDto, user: User) {
    await this.memberOnSchoolService.validateAccess({
      user: user,
      schoolId: createStudentDto.schoolId,
    });

    const request = { data: createStudentDto };
    return this.studentRepository.create(request);
  }

  async createManyStudents(
    createManyStudentsDto: CreateManyStudentsDto,
    user: User,
  ) {
    await this.memberOnSchoolService.validateAccess({
      user: user,
      schoolId: createManyStudentsDto.students[0].schoolId,
    });

    const request = { data: createManyStudentsDto };
    return this.studentRepository.createMany(request);
  }

  async getStudentById(getStudentDto: GetStudentDto, userId: string) {
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
  }

  async getAllStudents(getAllStudentsDto: GetAllStudentsDto, user: User) {
    await this.validateAccessMember({
      user: user,
      schoolId: getAllStudentsDto.schoolId,
    });

    return this.studentRepository.findAll({
      classId: getAllStudentsDto.classId,
    });
  }

  async updateStudent(updateStudentDto: UpdateStudentDto, user: User) {
    await this.memberOnSchoolService.validateAccess({
      user: user,
      schoolId: updateStudentDto.body.schoolId,
    });

    const request = {
      studentId: updateStudentDto.query.studentId,
      data: updateStudentDto,
    };
    return this.studentRepository.update(request);
  }

  async deleteStudent(deleteStudentDto: DeleteStudentDto, user: User) {
    const student = await this.studentRepository.findById({
      studentId: deleteStudentDto.id,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.memberOnSchoolService.validateAccess({
      user: user,
      schoolId: student.schoolId,
    });

    return this.studentRepository.delete({ studentId: deleteStudentDto.id });
  }
}
