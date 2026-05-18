import {
  Attendance,
  AttendanceRow,
  AttendanceTable,
  StudentOnSubject,
  User,
} from '@prisma/client';
import { GetUser, Public } from '../auth/decorators';
import { AttendanceService } from './attendance.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  CreateAttendanceDto,
  GetAttendanceByIdDto,
  GetAttendanceExportExcelDto,
  UpdateAttendanceDto,
  UpdateManyDto,
} from './dto';
import { UserGuard } from '../auth/guard';
import { FastifyRequest } from 'fastify';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/attendances')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @UseGuards(UserGuard)
  @Get('export-excel')
  exportExcel(
    @Query() dto: GetAttendanceExportExcelDto,
    @GetUser() user: UserJwtPayload,
    @Req() req: FastifyRequest,
  ) {
    return this.attendanceService.exportExcel(dto, user, req);
  }

  @UseGuards(UserGuard)
  @Get(':attendanceId')
  getAttendanceById(
    @Param() dto: GetAttendanceByIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceService.getAttendanceById(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  createAttendance(
    @Body() dto: CreateAttendanceDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  updateAttendance(
    @Body() dto: UpdateAttendanceDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceService.update(dto, user);
  }

  @Patch('by-qr-code')
  updateByQrCode(@Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(dto);
  }

  @UseGuards(UserGuard)
  @Patch('many')
  updateMany(@Body() dto: UpdateManyDto, @GetUser() user: UserJwtPayload) {
    return this.attendanceService.updateMany(dto, user);
  }
}
