import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetWordCloudsBySubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetWordCloudByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  wordCloudId: string;
}
