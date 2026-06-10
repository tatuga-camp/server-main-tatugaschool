import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetWordCloudSetsBySubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class WordCloudSetIdParamDto {
  @IsNotEmpty()
  @IsMongoId()
  setId: string;
}
