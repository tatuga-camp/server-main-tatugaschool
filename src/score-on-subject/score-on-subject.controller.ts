import { ScoreOnSubjectService } from './score-on-subject.service';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CreateScoreOnSubjectDto,
  GetAllScoreOnSubjectBySujectIdDto,
  UpdateScoreOnSubjectDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/score-on-subjects')
export class ScoreOnSubjectController {
  constructor(private scoreOnSubjectService: ScoreOnSubjectService) {}

  @Get('subject/:subjectId')
  getScoreOnSubject(
    @Param() dto: GetAllScoreOnSubjectBySujectIdDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnSubjectService.GetAllScoreOnSubjectBySubjectId(
      dto,
      user,
    );
  }

  @Post()
  createScoreOnSubject(
    @Body() dto: CreateScoreOnSubjectDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnSubjectService.createScoreOnSubject(dto, user);
  }

  @Patch()
  updateScoreOnSubject(
    @Body() dto: UpdateScoreOnSubjectDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnSubjectService.updateScoreOnSubject(dto, user);
  }
}
