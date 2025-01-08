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
import { StudentGuard, UserGuard } from '../auth/guard';
import {
  CreateAttendanceTableDto,
  DeleteAttendanceTableDto,
  GetAttendanceTableById,
  GetAttendanceTableBySubjectIdDto,
  GetAttendanceTablesDto,
  UpdateAttendanceTableDto,
} from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { Student, User } from '@prisma/client';

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

  @UseGuards(StudentGuard)
  @Get('student/:studentId/subject/:subjectId')
  GetAttendanceTableByStudentId(
    @Param() dto: GetAttendanceTableBySubjectIdDto,
    @GetStudent() student: Student,
  ) {
    return this.attendanceTableService.getBySubjectIdOnStudentOnSubject(
      dto,
      student,
    );
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
