import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma, SubscriptionNotification } from '@prisma/client';

export type Repository = {
  create(
    request: Prisma.SubscriptionNotificationCreateArgs,
  ): Promise<SubscriptionNotification>;
  findMany(
    request: Prisma.SubscriptionNotificationFindManyArgs,
  ): Promise<SubscriptionNotification[]>;
  findUnique(
    request: Prisma.SubscriptionNotificationFindUniqueArgs,
  ): Promise<SubscriptionNotification>;
  findFirst(
    request: Prisma.SubscriptionNotificationFindFirstArgs,
  ): Promise<SubscriptionNotification>;
  update(request: Prisma.SubscriptionNotificationUpdateArgs): Promise<any>;
  delete(request: Prisma.SubscriptionNotificationDeleteArgs): Promise<any>;
};

@Injectable()
export class PushRepository implements Repository {
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(PushRepository.name);
  }

  async findMany(
    request: Prisma.SubscriptionNotificationFindManyArgs,
  ): Promise<SubscriptionNotification[]> {
    try {
      return await this.prisma.subscriptionNotification.findMany(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findFirst(
    request: Prisma.SubscriptionNotificationFindFirstArgs,
  ): Promise<SubscriptionNotification> {
    try {
      return await this.prisma.subscriptionNotification.findFirst(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findUnique(
    request: Prisma.SubscriptionNotificationFindUniqueArgs,
  ): Promise<SubscriptionNotification> {
    try {
      return await this.prisma.subscriptionNotification.findUnique(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async create(
    request: Prisma.SubscriptionNotificationCreateArgs,
  ): Promise<any> {
    try {
      return await this.prisma.subscriptionNotification.create(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(
    request: Prisma.SubscriptionNotificationUpdateArgs,
  ): Promise<any> {
    try {
      return await this.prisma.subscriptionNotification.update(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(
    request: Prisma.SubscriptionNotificationDeleteArgs,
  ): Promise<any> {
    try {
      return await this.prisma.subscriptionNotification.delete(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
