import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Student, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { SchoolService } from './../school/school.service';
import { DeleteStudentDto } from './dto/delete-student.dto';
import { GetAllStudentsDto, GetStudentDto } from './dto/get-student.dto';
import { UpdateStudentDto } from './dto/patch-student.dto';
import { CreateStudentDto } from './dto/post-student.dto';
import { StudentRepository } from './student.repository';

@Injectable()
export class StudentService {
  logger = new Logger(StudentService.name);
  studentRepository: StudentRepository;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MemberOnSchoolService))
    private memberOnSchoolService: MemberOnSchoolService,
    private googleStorageService: GoogleStorageService,
    private classroomService: ClassService,
  ) {
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async createStudent(dto: CreateStudentDto, user: User): Promise<Student> {
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
          'https://storage.googleapis.com/public-tatugaschool/avatars/1.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/2.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/3.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/4.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/5.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/6.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/7.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/8.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/9.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/10.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/11.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/12.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/13.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/14.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/15.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/16.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/17.png',
          'https://storage.googleapis.com/public-tatugaschool/avatars/18.png',
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
    student?: Student | undefined,
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

      if (student && student.id !== student.id) {
        throw new ForbiddenException('Forbidden access');
      }

      return student;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllStudents(dto: GetAllStudentsDto, user: User): Promise<Student[]> {
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

  async resetStudnetPassword(
    dto: { studentId: string },
    user: User,
  ): Promise<Student> {
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
    student?: Student | undefined,
  ): Promise<Student> {
    try {
      if (dto.body.photo && !dto.body.blurHash) {
        throw new BadRequestException('BlurHash is required for photo');
      }
      const getStudent = await this.studentRepository.findById({
        studentId: dto.query.studentId,
      });

      if (!getStudent) {
        throw new NotFoundException('Student not found');
      }

      if (!user && !student) {
        throw new BadRequestException('User Or Student is required');
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

      if (student && student.id !== student.id) {
        throw new ForbiddenException('Forbidden access');
      }

      let hash: string | null = student.password;

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
