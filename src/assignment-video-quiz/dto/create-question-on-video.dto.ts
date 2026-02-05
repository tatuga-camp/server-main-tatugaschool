import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateQuestionOnVideoDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;

  @IsNotEmpty()
  @IsString()
  question: string;

  @IsArray()
  @IsString({ each: true })
  options: string[];

  @IsArray()
  @IsNumber({}, { each: true })
  correctOptions: number[];

  @IsNotEmpty()
  @IsNumber()
  timestamp: number;
}
