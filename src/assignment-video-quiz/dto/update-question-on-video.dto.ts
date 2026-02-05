import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionOnVideoDto } from './create-question-on-video.dto';

export class UpdateQuestionOnVideoDto extends PartialType(
  CreateQuestionOnVideoDto,
) {}
