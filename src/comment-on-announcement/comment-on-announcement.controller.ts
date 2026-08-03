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
import { CommentOnAnnouncementService } from './comment-on-announcement.service';
import {
  CreateCommentOnAnnouncementDto,
  DeleteCommentOnAnnouncementDto,
  GetCommentOnAnnouncementByAnnouncementIdDto,
  UpdateCommentOnAnnouncementDto,
} from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/comment-on-announcements')
export class CommentOnAnnouncementController {
  constructor(
    private commentOnAnnouncementService: CommentOnAnnouncementService,
  ) {}

  @UseGuards(StudentGuard)
  @Get('announcement/:announcementId/student')
  getByAnnouncementFromStudent(
    @Param() dto: GetCommentOnAnnouncementByAnnouncementIdDto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.commentOnAnnouncementService.getByAnnouncement(
      dto,
      null,
      student,
    );
  }

  @UseGuards(UserGuard)
  @Get('announcement/:announcementId/teacher')
  getByAnnouncementFromTeacher(
    @Param() dto: GetCommentOnAnnouncementByAnnouncementIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.commentOnAnnouncementService.getByAnnouncement(dto, user, null);
  }

  @UseGuards(StudentGuard)
  @Post('student')
  createFromStudent(
    @GetStudent() student: StudentJwtPayload,
    @Body() dto: CreateCommentOnAnnouncementDto,
  ) {
    return this.commentOnAnnouncementService.createFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Post('teacher')
  createFromTeacher(
    @GetUser() user: UserJwtPayload,
    @Body() dto: CreateCommentOnAnnouncementDto,
  ) {
    return this.commentOnAnnouncementService.createFromTeacher(dto, user);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  updateFromStudent(
    @GetStudent() student: StudentJwtPayload,
    @Body() dto: UpdateCommentOnAnnouncementDto,
  ) {
    return this.commentOnAnnouncementService.updateFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Patch('teacher')
  updateFromTeacher(
    @GetUser() user: UserJwtPayload,
    @Body() dto: UpdateCommentOnAnnouncementDto,
  ) {
    return this.commentOnAnnouncementService.updateFromTeacher(dto, user);
  }

  @UseGuards(StudentGuard)
  @Delete(':commentOnAnnouncementId/student')
  deleteFromStudent(
    @GetStudent() student: StudentJwtPayload,
    @Param() dto: DeleteCommentOnAnnouncementDto,
  ) {
    return this.commentOnAnnouncementService.deleteFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Delete(':commentOnAnnouncementId/teacher')
  deleteFromTeacher(
    @GetUser() user: UserJwtPayload,
    @Param() dto: DeleteCommentOnAnnouncementDto,
  ) {
    return this.commentOnAnnouncementService.deleteFromTeacher(dto, user);
  }
}
