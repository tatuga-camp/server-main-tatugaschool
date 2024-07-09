import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsMongoId, IsNotEmpty } from 'class-validator';

export class GetTeamQueryDto {
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

export class GetTeamParamDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
