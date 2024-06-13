import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { AttendanceService } from './attendance.service';
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { GetAttendanceByIdDto, UpdateAttendanceDto } from './dto';

@Controller('v1/attendances')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get(':attendanceId')
  getAttendanceById(@Param() dto: GetAttendanceByIdDto, @GetUser() user: User) {
    return this.attendanceService.getAttendanceById(dto, user);
  }

  @Patch()
  updateAttendance(@Body() dto: UpdateAttendanceDto, @GetUser() user: User) {
    return this.attendanceService.updateAttendance(dto, user);
  }
}
