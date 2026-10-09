import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { QuizService } from './quiz.service';
import {
  CreateQuizQuestionDto,
  DuplicateQuizDto,
  ReorderQuizQuestionsDto,
  UpdateQuizQuestionDto,
} from './dto';

@UseGuards(UserGuard)
@Controller('v1/quiz')
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Get('assignment/:assignmentId/questions')
  getQuestions(@Param('assignmentId') assignmentId: string, @GetUser() user: UserJwtPayload) {
    return this.quizService.getQuestions(assignmentId, user);
  }

  @Post('questions')
  createQuestion(@Body() dto: CreateQuizQuestionDto, @GetUser() user: UserJwtPayload) {
    return this.quizService.createQuestion(dto, user);
  }

  @Patch('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateQuizQuestionDto, @GetUser() user: UserJwtPayload) {
    return this.quizService.updateQuestion(id, dto, user);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string, @GetUser() user: UserJwtPayload) {
    return this.quizService.deleteQuestion(id, user);
  }

  @Patch('assignment/:assignmentId/reorder')
  reorder(@Param('assignmentId') assignmentId: string, @Body() dto: ReorderQuizQuestionsDto, @GetUser() user: UserJwtPayload) {
    return this.quizService.reorder(assignmentId, dto, user);
  }

  @Post('assignment/:assignmentId/duplicate')
  duplicate(@Param('assignmentId') assignmentId: string, @Body() dto: DuplicateQuizDto, @GetUser() user: UserJwtPayload) {
    return this.quizService.duplicate(assignmentId, dto, user);
  }
}
