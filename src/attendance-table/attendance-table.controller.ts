import { AttendanceTableService } from './attendance-table.service';
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
import { UserGuard } from '../auth/guard';
import {
  CreateAttendanceTableDto,
  DeleteAttendanceTableDto,
  GetAttendanceTableById,
  GetAttendanceTablesDto,
  UpdateAttendanceTableDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/attendance-tables')
export class AttendanceTableController {
  constructor(private attendanceTableService: AttendanceTableService) {}

  @UseGuards(UserGuard)
  @Get('subject/:subjectId')
  GetAttendanceTables(
    @Param() dto: GetAttendanceTablesDto,
    @GetUser() user: User,
  ) {
    return this.attendanceTableService.getBySubjectId(dto, user);
  }

  @UseGuards(UserGuard)
  @Get(':attendanceTableId')
  GetAttendanceTableById(
    @Param() dto: GetAttendanceTableById,
    @GetUser() user: User,
  ) {
    return this.attendanceTableService.getAttendanceTableById(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  CreateAttendanceTable(
    @Body() dto: CreateAttendanceTableDto,
    @GetUser() user: User,
  ) {
    return this.attendanceTableService.createAttendanceTable(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  UpdateAttendanceTable(
    @Body() dto: UpdateAttendanceTableDto,
    @GetUser() user: User,
  ) {
    return this.attendanceTableService.updateAttendanceTable(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':attendanceTableId')
  DeleteAttendanceTable(
    @Param() dto: DeleteAttendanceTableDto,
    @GetUser() user: User,
  ) {
    return this.attendanceTableService.deleteAttendanceTable(dto, user);
  }
}
