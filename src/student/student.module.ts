import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from './repository/student.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [StudentService, StudentRepository],
  controllers: [StudentController],
})
export class StudentModule {}
