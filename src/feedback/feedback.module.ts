import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedbackRepository } from './feedback.repository';

@Module({
  imports: [PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, FeedbackRepository],
  exports: [FeedbackService],
})
export class FeedbackModule {} 