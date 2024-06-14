import { IsOptional, IsInt, Min, IsNotEmpty, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSchoolsDto {
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
}

export class GetSchoolByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
