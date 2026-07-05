import { IsMongoId, IsNotEmpty, Matches } from 'class-validator';

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

export class GetWordCloudResultsByTokenDto {
  @IsNotEmpty()
  @Matches(/^[a-f0-9]{32}$/)
  token: string;
}
