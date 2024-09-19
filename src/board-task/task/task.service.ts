import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { DeleteTaskDto } from './dto/delete-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskRepository } from './task.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  taskRepository: TaskRepository = new TaskRepository(this.prisma);

  constructor(
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  async createTask(createTaskDto: CreateTaskDto, user: User) {
    this.logger.log('Creating a new task', { createTaskDto, user });
    try {
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: createTaskDto.teamId,
      });
      return this.taskRepository.create({ data: createTaskDto });
    } catch (error) {
      this.logger.error('Error creating task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateTask(updateTaskDto: UpdateTaskDto, user: User) {
    this.logger.log('Updating task', { updateTaskDto, user });
    try {
      const task = await this.taskRepository.findById({
        taskId: updateTaskDto.query.taskId,
      });
      if (!task) throw new NotFoundException('Task not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: task.teamId,
      });
      return this.taskRepository.update({
        taskId: updateTaskDto.query.taskId,
        data: updateTaskDto.body,
      });
    } catch (error) {
      this.logger.error('Error updating task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteTask(deleteTaskDto: DeleteTaskDto, user: User) {
    this.logger.log('Deleting task', { deleteTaskDto, user });
    try {
      const task = await this.taskRepository.findById({
        taskId: deleteTaskDto.taskId,
      });
      if (!task) throw new NotFoundException('Task not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: task.teamId,
      });
      return this.taskRepository.delete({ taskId: deleteTaskDto.taskId });
    } catch (error) {
      this.logger.error('Error deleting task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getTaskById(taskId: string, user: User) {
    this.logger.log('Getting task by id', { taskId, user });
    try {
      const task = await this.taskRepository.findById({ taskId });
      if (!task) throw new NotFoundException('Task not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: task.teamId,
      });
      return task;
    } catch (error) {
      this.logger.error('Error getting task by id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getTasksByColumId(columId: string, user: User) {
    this.logger.log('Getting tasks by colum id', { columId, user });
    try {
      return this.taskRepository.findByColumId({ columId });
    } catch (error) {
      this.logger.error('Error getting tasks by colum id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
