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
import { AdminGuard, UserGuard } from '../auth/guard';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/feedbacks')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UseGuards(UserGuard)
  create(@GetUser() user: UserJwtPayload, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(user, dto);
  }

  @Get()
  @UseGuards(AdminGuard)
  findAll(@Query() query: QueryFeedbackDto) {
    return this.feedbackService.findAll(query);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.feedbackService.remove(id);
  }
}
