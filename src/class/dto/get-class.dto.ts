import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class GetClassDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  classId: string;
}

export class GetClassByClassIdDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  classId: string;
}

export class GetClassByPageDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @IsNotEmpty()
  @IsString()
  schoolId: string;
}
