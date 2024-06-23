import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
