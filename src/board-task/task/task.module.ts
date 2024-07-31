import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { UsersService } from '../../users/users.service';

@Module({
  providers: [TaskService, UsersService],
  controllers: [TaskController],
})
export class TaskModule {}
