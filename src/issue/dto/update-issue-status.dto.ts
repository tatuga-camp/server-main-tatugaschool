import { IssueStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateIssueStatusDto {
  @IsEnum(IssueStatus)
  status: IssueStatus;
}
