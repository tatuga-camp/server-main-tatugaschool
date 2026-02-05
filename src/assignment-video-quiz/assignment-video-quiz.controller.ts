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
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { AssignmentVideoQuizService } from './assignment-video-quiz.service';
import { CreateQuestionOnVideoDto, UpdateQuestionOnVideoDto } from './dto';

@UseGuards(UserGuard)
@Controller('v1/assignment-video-quiz')
export class AssignmentVideoQuizController {
  constructor(private service: AssignmentVideoQuizService) {}

  @Post()
  create(@Body() dto: CreateQuestionOnVideoDto, @GetUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get('assignment/:assignmentId')
  getManyByAssignmentId(
    @Param('assignmentId') assignmentId: string,
    @GetUser() user: User,
  ) {
    return this.service.getManyByAssignmentId(assignmentId, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionOnVideoDto,
    @GetUser() user: User,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @GetUser() user: User) {
    return this.service.delete(id, user);
  }
}
