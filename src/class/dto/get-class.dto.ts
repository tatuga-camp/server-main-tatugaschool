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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  schoolId?: string;
}
