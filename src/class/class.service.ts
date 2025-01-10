import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from './class.repository';
import {
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestReorderClass,
} from './interfaces/class.interface';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { Class, Student, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentRepository } from '../student/student.repository';
import { CreateClassDto, DeleteClassDto, UpdateClassDto } from './dto';

@Injectable()
export class ClassService {
  private logger = new Logger(ClassService.name);
  private studentRepository: StudentRepository;
  constructor(
    private classRepository: ClassRepository,
    private memberOnSchoolService: MemberOnSchoolService,
    private prisma: PrismaService,
  ) {
    this.studentRepository = new StudentRepository(prisma);
  }

  async getById(
    dto: { classId: string },
    user: User,
  ): Promise<Class & { students: Student[] }> {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });
      if (!classroom) {
        throw new NotFoundException('Class not found');
      }
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      const students = await this.studentRepository.findByClassId({
        classId: dto.classId,
      });

      return { ...classroom, students };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createClass(createClassDto: CreateClassDto, user: User) {
    try {
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: createClassDto.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException("You're not allowed to create class");
      }

      return await this.classRepository.create(createClassDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getBySchool(
    dto: {
      schoolId: string;
      isAchieved: boolean;
    },
    user: User,
  ): Promise<(Class & { studentNumbers: number })[]> {
    try {
      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: dto.schoolId,
      });
      const classes = await this.prisma.class.findMany({
        where: {
          schoolId: dto.schoolId,
          isAchieved: dto.isAchieved,
        },
      });

      const classesWithStudetNumber = await Promise.all(
        classes.map(async (c) => {
          const studentNumbers = await this.studentRepository.count({
            where: {
              classId: c.id,
            },
          });
          return { ...c, studentNumbers };
        }),
      );

      return classesWithStudetNumber;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(dto: { classIds: string[] }, user: User): Promise<Class[]> {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classIds[0],
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException('You are not allowed to reorder class');
      }

      const result = await Promise.allSettled(
        dto.classIds.map(async (classId, index) => {
          return await this.classRepository.update({
            where: { id: classId },
            data: { order: index + 1 },
          });
        }),
      );

      const success = result
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

      return success;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: UpdateClassDto, user: User) {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.query.classId,
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException("You're not allowed to update class");
      }
      return await this.classRepository.update({
        where: { id: dto.query.classId },
        data: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteClassDto, user: User) {
    try {
      const classroom = await this.classRepository.findById({
        classId: dto.classId,
      });

      if (!classroom) {
        throw new NotFoundException('Class not found');
      }

      const member = await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      if (member.role !== 'ADMIN') {
        throw new ForbiddenException('You are not allowed to delete class');
      }

      return await this.classRepository.delete({ classId: dto.classId });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
