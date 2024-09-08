import { IsOptional, IsInt, Min, IsNotEmpty, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSchoolByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
