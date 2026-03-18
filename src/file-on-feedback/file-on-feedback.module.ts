import { Module } from '@nestjs/common';
import { FileOnFeedbackService } from './file-on-feedback.service';
import { FileOnFeedbackController } from './file-on-feedback.controller';
import { FileOnFeedbackRepository } from './file-on-feedback.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FileOnFeedbackController],
  providers: [FileOnFeedbackService, FileOnFeedbackRepository],
  exports: [FileOnFeedbackService],
})
export class FileOnFeedbackModule {}
