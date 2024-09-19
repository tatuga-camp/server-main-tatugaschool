import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from './class.repository';
import { CreateClassDto } from './dto/create-class.dto';
import { ReorderClassDto, UpdateClassDto } from './dto/update-class.dto';
import {
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestReorderClass,
} from './interfaces/class.interface';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassService {
  logger = new Logger(ClassService.name);
  constructor(
    private classRepository: ClassRepository,
    private memberOnSchoolService: MemberOnSchoolService,
    private prisma: PrismaService,
  ) {}

  async createClass(createClassDto: CreateClassDto, user: User) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: createClassDto.schoolId,
      });
      return await this.classRepository.create(createClassDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateClass(dto: UpdateClassDto, user: User) {
    try {
      const { classId } = dto.query;
      const classroom = await this.classRepository.findById({ classId });
      if (!classroom) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: classroom.schoolId,
      });

      const existingClass = await this.classRepository.findById({
        classId: classId,
      });
      if (!existingClass) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }

      const updateClasses = await this.classRepository.update({
        query: { classId },
        data: { ...dto.body },
      });

      return updateClasses;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getClassById(classId: string, user: User) {
    try {
      const request: RequestGetClass = { classId };
      const existingClass = await this.classRepository.findById(request);

      if (!existingClass) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: existingClass.schoolId,
      });

      return existingClass;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllClasses(user: User, schoolId: string) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: schoolId,
      });

      return await this.classRepository.findAll();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getClassesWithPagination(
    page: number,
    limit: number,
    schoolId: string,
    user: User,
  ) {
    try {
      const request: RequestGetClassByPage = { page, limit, schoolId };

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: schoolId,
      });

      return await this.classRepository.findWithPagination(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorderClasses(reorderClassDto: ReorderClassDto, user: User) {
    try {
      const request: RequestReorderClass = {
        classIds: reorderClassDto.classIds,
      };
      await this.validateClasses(request, user);
      return await this.classRepository.reorder(request);
    } catch (error) {
      this.logger.error(error);
      console.log('error', error);

      throw error;
    }
  }

  private async validateClasses(request: RequestReorderClass, user: User) {
    await Promise.all(
      request.classIds.map(async (id) => {
        const classData = await this.prisma.class.findUnique({
          where: { id },
          include: {
            school: {
              include: {
                memberOnSchools: true,
              },
            },
          },
        });

        if (!classData) {
          throw new ForbiddenException(`Class with id ${id} not found`);
        }

        const hasPermission = classData.school.memberOnSchools.some(
          (member) => member.userId === user.id && member.role === 'ADMIN',
        );

        if (!hasPermission) {
          throw new ForbiddenException(
            `Permission denied for class with id ${id}`,
          );
        }
      }),
    );
  }

  async deleteClass(classId: string, user: User) {
    try {
      const request: RequestDeleteClass = { classId };
      const existingClass = await this.classRepository.findById({ classId });
      if (!existingClass) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }

      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: existingClass.schoolId,
      });

      return await this.classRepository.delete(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
