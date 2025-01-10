import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsInt,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';

export class GetClassByClassIdDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  classId: string;
}

export class GetClassBySchoolIdDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  schoolId: string;
}

export class GetClassByQueryDto {
  @IsNotEmpty()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isAchieved: boolean;
}
