import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { InternalGuard } from '../auth/guard/internal.guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { AnalyticsService } from './analytics.service';
import {
  GetAnalyticsParamDto,
  GetAnalyticsQueryDto,
  GetStudentDetailParamDto,
} from './dto/get-analytics.dto';

@Controller('v1/schools')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(UserGuard)
  @Get(':schoolId/analytics')
  async getAnalytics(
    @Param() param: GetAnalyticsParamDto,
    @Query() query: GetAnalyticsQueryDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.analyticsService.getAnalytics(
      user,
      param.schoolId,
      query.educationYear,
    );
  }

  @UseGuards(UserGuard)
  @Get(':schoolId/analytics/students/:studentId')
  async getStudentDetail(
    @Param() param: GetStudentDetailParamDto,
    @Query() query: GetAnalyticsQueryDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.analyticsService.getStudentDetail(
      user,
      param.schoolId,
      param.studentId,
      query.educationYear,
    );
  }

  @UseGuards(InternalGuard)
  @Post(':schoolId/analytics/recompute')
  async recompute(
    @Param() param: GetAnalyticsParamDto,
    @Query() query: GetAnalyticsQueryDto,
  ) {
    const result = await this.analyticsService.recompute(
      param.schoolId,
      query.educationYear,
    );
    return { ok: true, generatedAt: result.generatedAt };
  }
}
