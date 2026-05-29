import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class WordCloudIdParamDto {
  @IsNotEmpty()
  @IsMongoId()
  wordCloudId: string;
}

export class AnswerWordCloudDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  text: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  browserToken: string;
}
