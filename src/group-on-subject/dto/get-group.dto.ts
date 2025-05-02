import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetGroupOnSubjectsDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetGroupOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  groupOnSubjectId: string;
}
