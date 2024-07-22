import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Task } from '@prisma/client';
import {
  RequestCreateTask,
  RequestUpdateTask,
  RequestDeleteTask,
  RequestGetTask,
  RequestGetTasksByColumId,
} from './task.interface';

export interface TaskRepositoryType {
  create(request: RequestCreateTask): Promise<Task>;
  update(request: RequestUpdateTask): Promise<Task>;
  delete(request: RequestDeleteTask): Promise<Task>;
  findById(request: RequestGetTask): Promise<Task | null>;
  findByColumId(request: RequestGetTasksByColumId): Promise<Task[]>;
}

@Injectable()
export class TaskRepository implements TaskRepositoryType {
  private readonly logger = new Logger(TaskRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateTask): Promise<Task> {
    try {
      this.logger.log('Creating a new task', request);
      return await this.prisma.task.create({
        data: request.data,
      });
    } catch (error) {
      this.logger.error('Error creating task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(request: RequestUpdateTask): Promise<Task> {
    try {
      this.logger.log('Updating task', request);
      return await this.prisma.task.update({
        where: { id: request.taskId },
        data: request.data,
      });
    } catch (error) {
      this.logger.error('Error updating task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async delete(request: RequestDeleteTask): Promise<Task> {
    try {
      this.logger.log('Deleting task', request);
      return await this.prisma.task.delete({
        where: { id: request.taskId },
      });
    } catch (error) {
      this.logger.error('Error deleting task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findById(request: RequestGetTask): Promise<Task | null> {
    try {
      this.logger.log('Finding task by id', request);
      return await this.prisma.task.findUnique({
        where: { id: request.taskId },
      });
    } catch (error) {
      this.logger.error('Error finding task by id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findByColumId(request: RequestGetTasksByColumId): Promise<Task[]> {
    try {
      this.logger.log('Finding tasks by colum id', request);
      return await this.prisma.task.findMany({
        where: { columId: request.columId },
      });
    } catch (error) {
      this.logger.error('Error finding tasks by colum id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
