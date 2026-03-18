import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FileOnFeedbackService } from './file-on-feedback.service';
import { CreateFileOnFeedbackDto } from './dto/create-file-on-feedback.dto';
import { UserGuard } from '../auth/guard';
import { GetUser } from '../auth/decorators';

@Controller('v1/file-on-feedbacks')
export class FileOnFeedbackController {
  constructor(private readonly fileOnFeedbackService: FileOnFeedbackService) {}

  @Post(':feedbackId')
  @UseGuards(UserGuard)
  create(
    @Param('feedbackId') feedbackId: string,
    @Body() createFileOnFeedbackDto: CreateFileOnFeedbackDto,
  ) {
    return this.fileOnFeedbackService.create(
      feedbackId,
      createFileOnFeedbackDto,
    );
  }

  @Delete(':id')
  @UseGuards(UserGuard)
  remove(@Param('id') id: string) {
    return this.fileOnFeedbackService.remove(id);
  }
}
