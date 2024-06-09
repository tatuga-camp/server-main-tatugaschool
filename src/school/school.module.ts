import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  providers: [SchoolService],
  controllers: [SchoolController],
})
export class SchoolModule {}
