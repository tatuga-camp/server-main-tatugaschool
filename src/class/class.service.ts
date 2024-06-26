import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClassRepository } from './class.repository';
import { CreateClassDto } from './dto/create-class.dto';
import { ReorderClassDto, UpdateClassDto } from './dto/update-class.dto';
import {
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestReorderClass,
} from './interfaces/class.interface';
import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import { User } from '@prisma/client';

@Injectable()
export class ClassService {
  logger = new Logger(ClassService.name);
  constructor(
    private classRepository: ClassRepository,
    private memberOnSchoolService: MemberOnSchoolService,
  ) {}

  async createClass(createClassDto: CreateClassDto, user: User) {
    try {
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: createClassDto.schoolId,
      });
      return this.classRepository.create(createClassDto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateClass(updateClassDto: UpdateClassDto, user: User) {
    try {
      const { classId } = updateClassDto.query;
      await this.memberOnSchoolService.validateAccess({
        user: user,
        schoolId: updateClassDto.body.schoolId,
      });

      const existingClass = await this.classRepository.update({
        query: { classId },
        data: { ...updateClassDto.body },
      });
      if (!existingClass) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }
      return existingClass;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getClassById(classId: string) {
    try {
      const request: RequestGetClass = { classId };
      const existingClass = await this.classRepository.findById(request);
      if (!existingClass) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }
      return existingClass;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllClasses() {
    try {
      return this.classRepository.findAll();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getClassesWithPagination(page: number, limit: number) {
    try {
      const request: RequestGetClassByPage = { page, limit };
      return this.classRepository.findWithPagination(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorderClasses(reorderClassDto: ReorderClassDto) {
    try {
      const request: RequestReorderClass = {
        classIds: reorderClassDto.classIds,
      };
      return this.classRepository.reorder(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteClass(classId: string) {
    try {
      const request: RequestDeleteClass = { classId };
      const existingClass = await this.classRepository.findById({ classId });
      if (!existingClass) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }
      return this.classRepository.delete(request);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
