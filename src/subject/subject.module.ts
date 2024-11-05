import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [SubjectService, WheelOfNameService],
  controllers: [SubjectController],
})
export class SubjectModule {}
