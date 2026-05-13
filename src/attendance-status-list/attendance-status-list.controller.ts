import { AttendanceStatusListService } from './attendance-status-list.service';
import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateStatusAttendanceDto,
  DeleteStatusDto,
  UpdateStatusDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/attendance-status-lists')
export class AttendanceStatusListController {
  constructor(
    private attendanceStatusListService: AttendanceStatusListService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateStatusAttendanceDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.attendanceStatusListService.create(dto, user);
  }

  @Patch()
  async update(@Body() dto: UpdateStatusDto, @GetUser() user: UserJwtPayload) {
    return this.attendanceStatusListService.update(dto, user);
  }

  @Delete(':id')
  async delete(@Param() dto: DeleteStatusDto, @GetUser() user: UserJwtPayload) {
    return this.attendanceStatusListService.delete(dto, user);
  }
}
