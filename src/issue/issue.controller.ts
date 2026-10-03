import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { CreateIssueReportDto } from './dto/create-issue-report.dto';
import { QueryIssueReportsDto } from './dto/query-issue-reports.dto';
import { QueryIssuesDto } from './dto/query-issues.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { IssueService } from './issue.service';

@Controller('v1/issues')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  // Public on purpose: the error screen can appear on signed-out pages.
  // Throttled per IP by the "issueReport" throttler registered in IssueModule.
  @UseGuards(ThrottlerGuard)
  @Post('reports')
  createReport(
    @Body() dto: CreateIssueReportDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.issueService.createReport(dto, authorization);
  }

  @UseGuards(UserGuard)
  @Get()
  findAll(@Query() query: QueryIssuesDto, @GetUser() user: UserJwtPayload) {
    return this.issueService.findAll(query, user);
  }

  @UseGuards(UserGuard)
  @Get(':groupId')
  findOne(
    @Param('groupId') groupId: string,
    @Query() query: QueryIssueReportsDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.issueService.findOne(groupId, query, user);
  }

  @UseGuards(UserGuard)
  @Patch(':groupId/status')
  updateStatus(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateIssueStatusDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.issueService.updateStatus(groupId, dto, user);
  }
}
