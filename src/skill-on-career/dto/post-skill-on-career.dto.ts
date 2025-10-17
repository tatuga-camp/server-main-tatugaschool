import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSkillOnCareerDto {
  @IsNotEmpty()
  @IsMongoId()
  careerId: string;

  @IsNotEmpty()
  @IsMongoId()
  skillId: string;

  @IsNotEmpty()
  @IsString()
  reference: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Max(1)
  @Min(0)
  weight: number;
}
