import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateScoreOnStudentDto,
  DeleteScoreOnStudentDto,
  GetAllScoreOnStudentByStudentIdDto,
  GetAllScoreOnStudentBySubjectIdDto,
} from './dto';
import { ScoreOnStudentService } from './score-on-student.service';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

@Controller('v1/score-on-students')
export class ScoreOnStudentController {
  constructor(private scoreOnStudentService: ScoreOnStudentService) {}

  @Get('subject/:subjectId')
  getAllScoreOnStudentBySubjectId(
    @Param() dto: GetAllScoreOnStudentBySubjectIdDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnStudentService.getAllScoreOnStudentBySubjectId(
      dto,
      user,
    );
  }

  @Get('studentOnSubject/:studentOnSubjectId')
  getAllScoreOnStudentByStudentId(
    @Param() dto: GetAllScoreOnStudentByStudentIdDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnStudentService.getAllScoreOnStudentByStudentId(
      dto,
      user,
    );
  }

  @Post()
  createScoreOnStudent(
    @Body() dto: CreateScoreOnStudentDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnStudentService.createScoreOnStudent(dto, user);
  }

  @Delete(':scoreOnStudentId')
  deleteScoreOnStudent(
    @Param() dto: DeleteScoreOnStudentDto,
    @GetUser() user: User,
  ) {
    return this.scoreOnStudentService.deleteScoreOnStudent(dto, user);
  }
}
