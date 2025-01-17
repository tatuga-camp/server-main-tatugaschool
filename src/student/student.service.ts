import { GoogleStorageService } from './../google-storage/google-storage.service';
import { ClassRepository } from './../class/class.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentRepository } from './student.repository';
import {
  CreateManyStudentsDto,
  CreateStudentDto,
} from './dto/post-student.dto';
import * as bcrypt from 'bcrypt';
import { GetAllStudentsDto, GetStudentDto } from './dto/get-student.dto';
import { UsersService } from '../users/users.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { MemberOnSchool, Student, User } from '@prisma/client';
import { UpdateStudentDto } from './dto/patch-student.dto';
import { DeleteStudentDto } from './dto/delete-student.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../web-push/push.service';
import { ClassService } from '../class/class.service';

@Injectable()
export class StudentService {
  logger = new Logger(StudentService.name);
  studentRepository: StudentRepository;

  constructor(
    private prisma: PrismaService,
    private userService: UsersService,
    private memberOnSchoolService: MemberOnSchoolService,
    private googleStorageService: GoogleStorageService,
    private classroomService: ClassService,
  ) {
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }
  async createStudent(dto: CreateStudentDto, user: User) {
    try {
      let photo = dto.photo;
      const classroom = await this.classroomService.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('class not found');
      }

      await Promise.all([
        this.classroomService.validateAccess({
          classroom: classroom,
          classId: classroom.id,
        }),
        this.memberOnSchoolService.validateAccess({
          user: user,
          schoolId: classroom.schoolId,
        }),
      ]);

      if (!dto.photo) {
        const picture = [
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/1.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/2.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/3.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/4.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/5.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/6.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/7.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/8.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/9.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/10.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/11.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/12.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/13.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/14.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/15.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/16.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/17.png',
          'https://storage.googleapis.com/development-tatuga-school/public/avatars/18.png',
        ];

        const randomPicture =
          picture[Math.floor(Math.random() * picture.length)];
        photo = randomPicture;
      }

      delete dto.photo;
      return await this.studentRepository.create({
        ...dto,
        schoolId: classroom.schoolId,
        photo: photo,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentById(
    getStudentDto: GetStudentDto,
    user?: User | undefined,
    studentUser?: Student | undefined,
  ): Promise<Student> {
    try {
      const student = await this.studentRepository.findById({
        studentId: getStudentDto.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (user) {
        await this.memberOnSchoolService.validateAccess({
          user: user,
          schoolId: student.schoolId,
        });
      }

      if (studentUser && student.id !== studentUser.id) {
        throw new ForbiddenException('Forbidden access');
      }

      return student;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllStudents(dto: GetAllStudentsDto, user: User) {
    try {
      const classroom = await this.classroomService.classRepository.findById({
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
      return await this.studentRepository.findByClassId(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async resetStudnetPassword(dto: { studentId: string }, user: User) {
    try {
      const student = await this.studentRepository.findById({
        studentId: dto.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: student.schoolId,
      });

      return await this.studentRepository.update({
        query: {
          studentId: dto.studentId,
        },
        body: {
          password: null,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateStudent(
    dto: UpdateStudentDto,
    user?: User | undefined,
    studentUser?: Student | undefined,
  ): Promise<Student> {
    try {
      if (dto.body.photo && !dto.body.blurHash) {
        throw new BadRequestException('BlurHash is required for photo');
      }
      const student = await this.studentRepository.findById({
        studentId: dto.query.studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.classroomService.validateAccess({
        classId: student.classId,
      });

      if (user) {
        await this.memberOnSchoolService.validateAccess({
          user: user,
          schoolId: student.schoolId,
        });
      }

      if (studentUser && student.id !== studentUser.id) {
        throw new ForbiddenException('Forbidden access');
      }

      let hash: string | null = student.password;
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: student.schoolId,
      });

      if (dto.body.password) {
        hash = await bcrypt.hash(dto.body.password, 10);
      }
      return await this.studentRepository.update({
        query: {
          studentId: dto.query.studentId,
        },
        body: {
          ...dto.body,
          password: hash,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteStudent(
    deleteStudentDto: DeleteStudentDto,
    user: User,
  ): Promise<Student> {
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
}
