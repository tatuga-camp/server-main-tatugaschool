import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { AttendanceService } from './attendance.service';
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  GetAttendanceByIdDto,
  UpdateAttendanceDto,
  UpdateManyDto,
} from './dto';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/attendances')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get(':attendanceId')
  getAttendanceById(@Param() dto: GetAttendanceByIdDto, @GetUser() user: User) {
    return this.attendanceService.getAttendanceById(dto, user);
  }

  @Patch()
  updateAttendance(@Body() dto: UpdateAttendanceDto, @GetUser() user: User) {
    return this.attendanceService.update(dto, user);
  }
  @Patch('many')
  updateMany(@Body() dto: UpdateManyDto, @GetUser() user: User) {
    return this.attendanceService.updateMany(dto, user);
  }
}
