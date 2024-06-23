import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
export class GetSubjectByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetSubjectByPageDto {
  @IsNotEmpty()
  @IsMongoId()
  teamId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  limit: number;

  @IsOptional()
  @IsString()
  @MaxLength(199)
  search: string;

  @IsNotEmpty()
  @IsDateString()
  educationYear: Date;
}

export class getAllSubjectsByTeamIdParam {
  @IsNotEmpty()
  @IsMongoId()
  teamId: string;
}

export class getAllSubjectsByTeamIdQuery {
  @IsNotEmpty()
  @IsDateString()
  educationYear: Date;
}
