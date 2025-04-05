import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { FeedbackRepository } from './feedback.repository';

@Injectable()
export class FeedbackService {
  constructor(private feedbackRepository: FeedbackRepository) {}

  async create(userId: string, createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackRepository.create({
      data: {
        ...createFeedbackDto,
        userId,
      },
      include: {
        user: true,
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
    return this.feedbackRepository.delete({
      where: { id },
    });
  }
} 