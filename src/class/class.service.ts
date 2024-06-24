import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(
    private classRepository: ClassRepository,
    private memberOnSchoolService: MemberOnSchoolService,
  ) {}

  async createClass(createClassDto: CreateClassDto, user: User) {
    await this.memberOnSchoolService.validateAccess({
      user: user,
      schoolId: createClassDto.schoolId,
    });
    return this.classRepository.create(createClassDto);
  }

  async updateClass(updateClassDto: UpdateClassDto, user: User) {
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
  }

  async getClassById(classId: string) {
    const request: RequestGetClass = { classId };
    const existingClass = await this.classRepository.findById(request);
    if (!existingClass) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }
    return existingClass;
  }

  async getAllClasses() {
    return this.classRepository.findAll();
  }

  async getClassesWithPagination(page: number, limit: number) {
    const request: RequestGetClassByPage = { page, limit };
    return this.classRepository.findWithPagination(request);
  }

  async reorderClasses(reorderClassDto: ReorderClassDto) {
    const request: RequestReorderClass = { classIds: reorderClassDto.classIds };
    return this.classRepository.reorder(request);
  }

  async deleteClass(classId: string) {
    const request: RequestDeleteClass = { classId };
    const existingClass = await this.classRepository.findById({ classId });
    if (!existingClass) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }
    return this.classRepository.delete(request);
  }
}
