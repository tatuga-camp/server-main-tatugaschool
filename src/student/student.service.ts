import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { StudentRepository } from './repository/student.repository';
import {
  CreateManyStudentsDto,
  CreateStudentDto,
} from './dto/create-student.dto';

import { GetAllStudentsDto, GetStudentDto } from './dto/get-student.dto';
import { UsersService } from 'src/users/users.service';
import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import { User } from '@prisma/client';

@Injectable()
export class StudentService {
  constructor(
    private studentRepository: StudentRepository,
    private userService: UsersService,
    private memberOnSchoolService: MemberOnSchoolService,
  ) {}

  async createStudent(createStudentDto: CreateStudentDto, user: User) {
    // const user = await this.userService.getUserById(userId);
    await this.memberOnSchoolService.validateAccess({
      user: user,
      schoolId: createStudentDto.schoolId,
    });

    const request = { data: createStudentDto };
    return this.studentRepository.create(request);
  }

  async createManyStudents(
    createManyStudentsDto: CreateManyStudentsDto,
    userId: string,
  ) {
    const user = await this.userService.getUserById(userId);

    if (
      !user ||
      !user.isMemberOfSchool(createManyStudentsDto.students[0].schoolId)
    ) {
      throw new ForbiddenException(
        'You do not have access to create students in this school',
      );
    }

    if (!user.isAdminOfSchool(createManyStudentsDto.students[0].schoolId)) {
      throw new ForbiddenException(
        'You must be an admin to create students in this school',
      );
    }

    const request = { data: createManyStudentsDto };
    return this.studentRepository.createMany(request);
  }

  async getStudentById(getStudentDto: GetStudentDto, userId: string) {
    const user = await this.userService.getUserById(userId);

    const student = await this.studentRepository.findById({
      id: getStudentDto.studentId,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!user || !user.isMemberOfSchool(student.schoolId)) {
      throw new ForbiddenException(
        'You do not have access to view this student',
      );
    }

    return student;
  }

  async getAllStudents(getAllStudentsDto: GetAllStudentsDto, userId: string) {
    const user = await this.userService.getUserById(userId);

    if (!user || !user.isMemberOfSchool(getAllStudentsDto.classId)) {
      throw new ForbiddenException(
        'You do not have access to view these students',
      );
    }

    return this.studentRepository.findAll({
      classId: getAllStudentsDto.classId,
    });
  }
}
