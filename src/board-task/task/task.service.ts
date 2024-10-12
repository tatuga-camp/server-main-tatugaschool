import { UserRepository } from './../../users/users.repository';
import { ColumRepository } from './../colum/colum.repository';
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
  private columRepository: ColumRepository = new ColumRepository(this.prisma);
  userRepository: UserRepository = new UserRepository(this.prisma);

  constructor(
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  async createTask(dto: CreateTaskDto, user: User) {
    try {
      const [colum, assignee] = await Promise.all([
        this.columRepository.findById({ columId: dto.columId }),
        this.userRepository.findById({ id: dto.assigneeId }),
      ]);

      if (!colum) throw new NotFoundException('Colum not found');
      if (!assignee) throw new NotFoundException('User not found');

      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: colum.teamId,
      });

      return await this.taskRepository.create({
        data: {
          ...dto,
          teamId: colum.teamId,
          schoolId: colum.schoolId,
          boardId: colum.boardId,
        },
      });
    } catch (error) {
      this.logger.error('Error creating task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateTask(updateTaskDto: UpdateTaskDto, user: User) {
    try {
      const task = await this.taskRepository.findById({
        taskId: updateTaskDto.query.taskId,
      });
      if (!task) throw new NotFoundException('Task not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: task.teamId,
      });
      return await this.taskRepository.update({
        taskId: updateTaskDto.query.taskId,
        data: updateTaskDto.body,
      });
    } catch (error) {
      this.logger.error('Error updating task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteTask(deleteTaskDto: DeleteTaskDto, user: User) {
    try {
      const task = await this.taskRepository.findById({
        taskId: deleteTaskDto.taskId,
      });
      if (!task) throw new NotFoundException('Task not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: task.teamId,
      });
      return await this.taskRepository.delete({ taskId: deleteTaskDto.taskId });
    } catch (error) {
      this.logger.error('Error deleting task', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getTaskById(taskId: string, user: User) {
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
    try {
      return await this.taskRepository.findByColumId({ columId });
    } catch (error) {
      this.logger.error('Error getting tasks by colum id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
