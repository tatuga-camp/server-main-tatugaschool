import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { UserGuard } from '../auth/guard';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@GetUser() user: UserJwtPayload, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user, dto);
  }

  @Get()
  findAll(@Query() query: QueryFeedbackDto, @GetUser() user: UserJwtPayload) {
    return this.feedbackService.findAll(query, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: UserJwtPayload) {
    return this.feedbackService.remove(id, user);
  }
}
