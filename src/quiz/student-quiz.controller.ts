// src/quiz/student-quiz.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { GetStudent } from '../auth/decorators';
import { StudentGuard } from '../auth/guard';
import { StudentJwtPayload } from '../interfaces/jwt-payload';
import { QuizIntegrityService } from '../quiz-integrity/quiz-integrity.service';
import { StudentQuizService } from './student-quiz.service';
import { IntegrityBatchDto, SaveQuizAnswerDto } from './dto';

@UseGuards(StudentGuard)
@Controller('v1/student/quiz')
export class StudentQuizController {
  constructor(
    private studentQuizService: StudentQuizService,
    private integrityService: QuizIntegrityService,
  ) {}

  @Get(':studentOnAssignmentId')
  getQuiz(@Param('studentOnAssignmentId') id: string, @GetStudent() student: StudentJwtPayload) {
    return this.studentQuizService.getQuiz(id, student);
  }

  @Post(':studentOnAssignmentId/start')
  @HttpCode(200)
  start(@Param('studentOnAssignmentId') id: string, @GetStudent() student: StudentJwtPayload) {
    return this.studentQuizService.start(id, student);
  }

  @Put(':studentOnAssignmentId/answers/:questionId')
  saveAnswer(
    @Param('studentOnAssignmentId') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SaveQuizAnswerDto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.studentQuizService.saveAnswer(id, questionId, dto, student);
  }

  @Post(':studentOnAssignmentId/integrity')
  @HttpCode(200)
  integrity(
    @Param('studentOnAssignmentId') id: string,
    @Body() dto: IntegrityBatchDto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.integrityService.ingest(id, student, dto);
  }

  @Post(':studentOnAssignmentId/submit')
  @HttpCode(200)
  submit(@Param('studentOnAssignmentId') id: string, @GetStudent() student: StudentJwtPayload) {
    return this.studentQuizService.submit(id, student);
  }
}
