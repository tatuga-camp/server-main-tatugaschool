import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { AppModule } from '../app.module';

@Module({
  imports: [AppModule, ScheduleModule.forRoot()],
  providers: [TaskService],
})
export class TaskModule {}
