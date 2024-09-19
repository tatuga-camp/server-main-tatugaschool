import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';

import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { DeleteTaskDto } from './dto/delete-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetUser } from '../../auth/decorators';
import { User } from '@prisma/client';
import { UserGuard } from '../../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  createTask(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User) {
    return this.taskService.createTask(createTaskDto, user);
  }

  @Put()
  updateTask(@Body() updateTaskDto: UpdateTaskDto, @GetUser() user: User) {
    return this.taskService.updateTask(updateTaskDto, user);
  }

  @Delete()
  deleteTask(@Body() deleteTaskDto: DeleteTaskDto, @GetUser() user: User) {
    return this.taskService.deleteTask(deleteTaskDto, user);
  }

  @Get(':taskId')
  getTaskById(@Param('taskId') taskId: string, @GetUser() user: User) {
    return this.taskService.getTaskById(taskId, user);
  }

  @Get('colum/:columId')
  getTasksByColumId(@Param('columId') columId: string, @GetUser() user: User) {
    return this.taskService.getTasksByColumId(columId, user);
  }
}
