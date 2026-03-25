import { NestFactory } from '@nestjs/core';
import { TaskModule } from './task/task.module';

async function bootstrapJob() {
  await NestFactory.createApplicationContext(TaskModule);
  console.log('Job process started...');
}

bootstrapJob();
