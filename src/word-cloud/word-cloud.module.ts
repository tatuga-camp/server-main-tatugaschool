import { Module } from '@nestjs/common';
import { WordCloudService } from './word-cloud.service';
import { WordCloudController } from './word-cloud.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [WordCloudService, TeacherOnSubjectService],
  controllers: [WordCloudController],
})
export class WordCloudModule {}
