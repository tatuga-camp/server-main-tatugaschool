import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { AttendanceRowService } from './attendance-row.service';
import {
  CreateAttendanceRowDto,
  DeleteAttendanceRowDto,
  GetAttendanceRowByIdDto,
  GetAttendanceRowsDto,
  UpdateAttendanceRowDto,
} from './dto';

@Controller('v1/attendance-rows')
export class AttendanceRowController {
  constructor(private attendanceRowService: AttendanceRowService) {}

  @UseGuards(UserGuard)
  @Get('/attendance-table/:attendanceTableId')
  getAttendanceRows(
    @Param() dto: GetAttendanceRowsDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceRowService.GetAttendanceRows(dto, user);
  }

  @UseGuards(UserGuard)
  @Get(':attendanceRowId')
  getAttendanceRowById(
    @Param() dto: GetAttendanceRowByIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceRowService.GetAttendanceRowById(dto, user);
  }

  @Get(':attendanceRowId/by-qr-code')
  getAttendanceRowByQrcode(@Param() dto: GetAttendanceRowByIdDto) {
    return this.attendanceRowService.GetAttendanceQrCode(dto);
  }

  @UseGuards(UserGuard)
  @Post()
  createAttendanceRow(
    @Body() dto: CreateAttendanceRowDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceRowService.CreateAttendanceRow(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  updateAttendanceRow(
    @Body() dto: UpdateAttendanceRowDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceRowService.UpdateAttendanceRow(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':attendanceRowId')
  deleteAttendanceRow(
    @Param() dto: DeleteAttendanceRowDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceRowService.DeleteAttendanceRow(dto, user);
  }
}
