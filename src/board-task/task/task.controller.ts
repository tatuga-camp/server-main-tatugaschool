import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  Get,
  Param,
} from '@nestjs/common';

import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { DeleteTaskDto } from './dto/delete-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetUser } from 'src/auth/decorators';
import { User } from '@prisma/client';

@Controller('task')
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
