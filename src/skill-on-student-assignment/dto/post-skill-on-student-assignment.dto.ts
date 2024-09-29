import { Transform } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateBySuggestionDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}

export class CreateDto {
  @IsNotEmpty()
  @IsMongoId()
  skillId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  weight: number;
}
