import { ClassRepository } from './../class/class.repository';
import {
  BadRequestException,
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
import * as bcrypt from 'bcrypt';
import { GetAllStudentsDto, GetStudentDto } from './dto/get-student.dto';
import { UsersService } from 'src/users/users.service';
import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import { MemberOnSchool, Student, User } from '@prisma/client';
import { UpdateStudentDto } from './dto/update-student.dto';
import { DeleteStudentDto } from './dto/delete-student.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestCreateManyStudents } from './interface/student.interface';

@Injectable()
export class StudentService {
  logger = new Logger(StudentService.name);
  studentRepository: StudentRepositoryType;
  classRepository: ClassRepository = new ClassRepository(this.prisma);
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

  async createStudent(dto: CreateStudentDto, user: User) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: dto.schoolId,
      });

      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('class not found');
      }

      if(classroom.schoolId !== dto.schoolId){
        throw new BadRequestException("Class not found in this school");
      }

      const request = { data: dto };
      return await this.studentRepository.create(request);
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

  async getAllStudents(dto: GetAllStudentsDto, user: User) {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('class not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      const request = { classId: dto.classId };
      return await this.studentRepository.findAll(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateStudent(dto: UpdateStudentDto, user: User) {
    try {
      let hash: string | null = null;
      const student = await this.studentRepository.findById({
        studentId: dto.query.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: student.schoolId,
      });

      if (dto.body.password) {
        hash = await bcrypt.hash(dto.body.password, 10);
      }
      console.log('hash', hash);
      return await this.studentRepository.update({
        query: {
          studentId: dto.query.studentId,
        },
        data: {
          ...dto.body,
          password: hash,
        },
      });
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

      return await this.studentRepository.delete({
        studentId: deleteStudentDto.studentId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async validateClass(request: RequestCreateManyStudents) {
    try {
      const classIds = [
        ...new Set(request.data.students.map((student) => student.classId)),
      ];

      const existingClasses = await this.prisma.class.findMany({
        where: {
          id: {
            in: classIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingClassIds = existingClasses.map((cls) => cls.id);
      const invalidClassIds = classIds.filter(
        (classId) => !existingClassIds.includes(classId),
      );

      if (invalidClassIds.length > 0) {
        throw new ForbiddenException(
          `Invalid classIds found: ${invalidClassIds.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async validateSchool(request: RequestCreateManyStudents) {
    try {
      const schoolIds = [
        ...new Set(request.data.students.map((student) => student.schoolId)),
      ];
      const existingSchools = await this.prisma.school.findMany({
        where: {
          id: {
            in: schoolIds,
          },
        },
        select: {
          id: true,
        },
      });
      const existingSchoolIds = existingSchools.map((school) => school.id);
      const invalidSchoolIds = schoolIds.filter(
        (schoolId) => !existingSchoolIds.includes(schoolId),
      );

      if (invalidSchoolIds.length > 0) {
        throw new ForbiddenException(
          `Invalid schoolIds found: ${invalidSchoolIds.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
