import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export const ISSUE_REPORT_LIMITS = {
  errorName: 200,
  message: 2000,
  stack: 20000,
  componentStack: 20000,
  pageUrl: 2000,
  userAgent: 1000,
} as const;

export class CreateIssueReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(ISSUE_REPORT_LIMITS.errorName)
  errorName: string;

  @IsString()
  @MaxLength(ISSUE_REPORT_LIMITS.message)
  message: string;

  @IsString()
  @MaxLength(ISSUE_REPORT_LIMITS.stack)
  stack: string;

  @IsString()
  @MaxLength(ISSUE_REPORT_LIMITS.componentStack)
  componentStack: string;

  @IsString()
  @MaxLength(ISSUE_REPORT_LIMITS.pageUrl)
  pageUrl: string;

  @IsString()
  @MaxLength(ISSUE_REPORT_LIMITS.userAgent)
  userAgent: string;

  @IsDateString()
  capturedAt: string;
}
