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

@Injectable()
export class ClassService {
  constructor(private classRepository: ClassRepository) {}

  async createClass(createClassDto: CreateClassDto) {
    return this.classRepository.create(createClassDto);
  }

  async updateClass(classId: string, updateClassDto: UpdateClassDto) {
    const existingClass = await this.classRepository.update({
      query: { classId },
      data: { ...updateClassDto },
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
