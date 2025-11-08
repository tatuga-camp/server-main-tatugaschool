import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGroupOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(599)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(599)
  description: string;

  @IsNotEmpty()
  @IsNumber()
  numberOfGroups: number;
}
