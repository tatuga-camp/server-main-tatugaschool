import { Module } from '@nestjs/common';
import { WordCloudSetService } from './word-cloud-set.service';
import { WordCloudSetController } from './word-cloud-set.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [WordCloudSetService, TeacherOnSubjectService],
  controllers: [WordCloudSetController],
})
export class WordCloudSetModule {}
