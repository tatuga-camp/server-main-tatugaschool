import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { FeedbackRepository } from './feedback.repository';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class FeedbackService {
  constructor(
    private feedbackRepository: FeedbackRepository,
    private prisma: PrismaService,
  ) {}

  async create(user: User, dto: CreateFeedbackDto) {
    const private_mode = dto.private;

    delete dto.private;
    const { files, ...data } = dto;

    return this.feedbackRepository.create({
      data: {
        ...data,
        ...(private_mode && { userId: user.id }),
        ...(files &&
          files.length > 0 && {
            fileOnFeedbacks: {
              create: files,
            },
          }),
      },
      include: {
        user: true,
        fileOnFeedbacks: true,
      },
    });
  }

  async findAll(query: QueryFeedbackDto) {
    const { page = 1, limit = 10, tag } = query;
    const skip = (page - 1) * limit;

    const where = tag ? { tag } : {};

    const [total, items] = await Promise.all([
      this.feedbackRepository.count({ where }),
      this.feedbackRepository.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
          fileOnFeedbacks: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async remove(id: string) {
    // Delete associated files first to avoid orphan records
    await this.prisma.fileOnFeedback.deleteMany({
      where: { feedbackId: id },
    });

    return this.feedbackRepository.delete({
      where: { id },
    });
  }
}
