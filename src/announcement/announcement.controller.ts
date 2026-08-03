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
import { AnnouncementService } from './announcement.service';
import {
  CreateAnnouncementDto,
  DeleteAnnouncementDto,
  GetAnnouncementBySubjectIdDto,
  UpdateAnnouncementDto,
} from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/announcements')
export class AnnouncementController {
  constructor(private announcementService: AnnouncementService) {}

  @UseGuards(UserGuard)
  @Post()
  create(
    @GetUser() user: UserJwtPayload,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('subject/:subjectId/teacher')
  getBySubjectFromTeacher(
    @Param() dto: GetAnnouncementBySubjectIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.announcementService.getBySubjectFromTeacher(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('subject/:subjectId/student')
  getBySubjectFromStudent(
    @Param() dto: GetAnnouncementBySubjectIdDto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.announcementService.getBySubjectFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Patch()
  update(
    @GetUser() user: UserJwtPayload,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':announcementId')
  delete(
    @GetUser() user: UserJwtPayload,
    @Param() dto: DeleteAnnouncementDto,
  ) {
    return this.announcementService.delete(dto, user);
  }
}
