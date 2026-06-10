import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SetIdParamDto {
  @IsNotEmpty()
  @IsMongoId()
  setId: string;
}

export class SetQuestionParamDto {
  @IsNotEmpty()
  @IsMongoId()
  setId: string;

  @IsNotEmpty()
  @IsMongoId()
  wordCloudId: string;
}

export class AppendQuestionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  question: string;
}

export class EditQuestionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  question: string;
}
