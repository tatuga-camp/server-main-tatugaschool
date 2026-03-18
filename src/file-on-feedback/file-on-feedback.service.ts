import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFileOnFeedbackDto } from './dto/create-file-on-feedback.dto';
import { FileOnFeedbackRepository } from './file-on-feedback.repository';

@Injectable()
export class FileOnFeedbackService {
  constructor(private readonly fileOnFeedbackRepo: FileOnFeedbackRepository) {}

  async create(
    feedbackId: string,
    createFileOnFeedbackDto: CreateFileOnFeedbackDto,
  ) {
    return this.fileOnFeedbackRepo.create({
      data: {
        feedbackId,
        url: createFileOnFeedbackDto.url,
        type: createFileOnFeedbackDto.type,
        size: createFileOnFeedbackDto.size,
      },
    });
  }

  async remove(id: string) {
    const file = await this.fileOnFeedbackRepo.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException(`File on feedback with ID ${id} not found`);
    }

    return this.fileOnFeedbackRepo.delete({
      where: { id },
    });
  }
}
