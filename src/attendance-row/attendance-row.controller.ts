import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceRowService } from './attendance-row.service';
import { UserGuard } from '../auth/guard';
import {
  CreateAttendanceRowDto,
  DeleteAttendanceRowDto,
  GetAttendanceRowByIdDto,
  GetAttendanceRowsDto,
  UpdateAttendanceRowDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@UseGuards(UserGuard)
@Controller('v1/attendance-rows')
export class AttendanceRowController {
  constructor(private attendanceRowService: AttendanceRowService) {}

  @Get('/attendance-table/:attendanceTableId')
  getAttendanceRows(@Param() dto: GetAttendanceRowsDto, @GetUser() user: User) {
    return this.attendanceRowService.GetAttendanceRows(dto, user);
  }

  @Get(':attendanceRowId')
  getAttendanceRowById(
    @Param() dto: GetAttendanceRowByIdDto,
    @GetUser() user: User,
  ) {
    return this.attendanceRowService.GetAttendanceRowById(dto, user);
  }

  @Post()
  createAttendanceRow(
    @Body() dto: CreateAttendanceRowDto,
    @GetUser() user: User,
  ) {
    return this.attendanceRowService.CreateAttendanceRow(dto, user);
  }

  @Patch()
  updateAttendanceRow(
    @Body() dto: UpdateAttendanceRowDto,
    @GetUser() user: User,
  ) {
    return this.attendanceRowService.UpdateAttendanceRow(dto, user);
  }

  @Delete(':attendanceRowId')
  deleteAttendanceRow(
    @Param() dto: DeleteAttendanceRowDto,
    @GetUser() user: User,
  ) {
    return this.attendanceRowService.DeleteAttendanceRow(dto, user);
  }
}
