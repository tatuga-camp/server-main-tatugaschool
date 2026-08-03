import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ReactionOnAnnouncementService } from './reaction-on-announcement.service';
import { ToggleReactionDto } from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/reaction-on-announcements')
export class ReactionOnAnnouncementController {
  constructor(
    private reactionOnAnnouncementService: ReactionOnAnnouncementService,
  ) {}

  @UseGuards(StudentGuard)
  @Post('toggle/student')
  toggleFromStudent(
    @GetStudent() student: StudentJwtPayload,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.reactionOnAnnouncementService.toggleFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Post('toggle/teacher')
  toggleFromTeacher(
    @GetUser() user: UserJwtPayload,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.reactionOnAnnouncementService.toggleFromTeacher(dto, user);
  }
}
