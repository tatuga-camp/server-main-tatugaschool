import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum IssueStatusFilter {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  ALL = 'ALL',
}

export class QueryIssuesDto {
  @IsOptional()
  @IsEnum(IssueStatusFilter)
  status?: IssueStatusFilter = IssueStatusFilter.OPEN;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
