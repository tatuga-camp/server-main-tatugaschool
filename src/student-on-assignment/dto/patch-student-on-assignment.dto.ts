import { StudentAssignmentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class UpdateStudentOnAssignmentQuery {
  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}

class UpdateStudentOnAssignmentBody {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(19999)
  body?: string;

  @IsOptional()
  @IsEnum(StudentAssignmentStatus)
  status?: StudentAssignmentStatus;

  @IsOptional()
  @IsBoolean()
  isAssigned?: boolean;
}

export class UpdateStudentOnAssignmentDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentOnAssignmentQuery)
  @ValidateNested()
  query: UpdateStudentOnAssignmentQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentOnAssignmentBody)
  @ValidateNested()
  body: UpdateStudentOnAssignmentBody;
}
