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
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
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
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(request: RequestDeleteTask): Promise<Task> {
    try {
      this.logger.log('Deleting task', request);
      return await this.prisma.task.delete({
        where: { id: request.taskId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findById(request: RequestGetTask): Promise<Task | null> {
    try {
      this.logger.log('Finding task by id', request);
      return await this.prisma.task.findUnique({
        where: { id: request.taskId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByColumId(request: RequestGetTasksByColumId): Promise<Task[]> {
    try {
      this.logger.log('Finding tasks by colum id', request);
      return await this.prisma.task.findMany({
        where: { columId: request.columId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
