import { IsMongoId, IsNotEmpty } from 'class-validator';
import { CreateRubricDto } from './create-rubric.dto';

export class UpdateRubricDto extends CreateRubricDto {
  @IsNotEmpty() @IsMongoId() rubricId: string;
}
