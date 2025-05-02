import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteGroupOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  groupOnSubjectId: string;
}
