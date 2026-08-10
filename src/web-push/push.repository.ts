import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma, SubscriptionNotification } from '@prisma/client';

// userId/studentId are optional, so Prisma-generated filters on them compile
// to `$expr`/`$ne: [field, "$$REMOVE"]` pipelines MongoDB cannot serve from an
// index. The notification-send lookups below therefore use findRaw with plain
// filters against the { userId, createAt } / { studentId } indexes.

type RawObjectId = { $oid: string };
type RawDate = { $date: string | { $numberLong: string } };

type RawSubscriptionNotification = {
  _id: RawObjectId;
  createAt: RawDate;
  updateAt: RawDate;
  data: unknown;
  endpoint: string;
  userAgent: string;
  expiredAt: RawDate;
  userId?: RawObjectId | null;
  studentId?: RawObjectId | null;
};

function fromRawDate(raw: RawDate): Date {
  return typeof raw.$date === 'string'
    ? new Date(raw.$date)
    : new Date(Number(raw.$date.$numberLong));
}

function fromRawSubscription(
  doc: RawSubscriptionNotification,
): SubscriptionNotification {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    updateAt: fromRawDate(doc.updateAt),
    data: doc.data as Prisma.JsonValue,
    endpoint: doc.endpoint,
    userAgent: doc.userAgent,
    expiredAt: fromRawDate(doc.expiredAt),
    userId: doc.userId?.$oid ?? null,
    studentId: doc.studentId?.$oid ?? null,
  };
}

export type Repository = {
  create(
    request: Prisma.SubscriptionNotificationCreateArgs,
  ): Promise<SubscriptionNotification>;
  findLatestForUser(userId: string): Promise<SubscriptionNotification | null>;
  findManyForStudents(
    studentIds: string[],
  ): Promise<SubscriptionNotification[]>;
  findManyForUsers(userIds: string[]): Promise<SubscriptionNotification[]>;
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

  async findLatestForUser(
    userId: string,
  ): Promise<SubscriptionNotification | null> {
    try {
      const docs = (await this.prisma.subscriptionNotification.findRaw({
        filter: { userId: { $oid: userId } },
        options: { sort: { createAt: -1 }, limit: 1 },
      })) as unknown as RawSubscriptionNotification[];
      return docs.length > 0 ? fromRawSubscription(docs[0]) : null;
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

  async findManyForStudents(
    studentIds: string[],
  ): Promise<SubscriptionNotification[]> {
    if (studentIds.length === 0) {
      return [];
    }
    try {
      const docs = (await this.prisma.subscriptionNotification.findRaw({
        filter: { studentId: { $in: studentIds.map((id) => ({ $oid: id })) } },
      })) as unknown as RawSubscriptionNotification[];
      return docs.map(fromRawSubscription);
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

  // Null userIds are dropped deliberately: a raw `{userId: null}` filter would
  // match every student subscription (their userId is null/missing), fanning a
  // member-targeted push out to student devices.
  async findManyForUsers(
    userIds: string[],
  ): Promise<SubscriptionNotification[]> {
    const ids = userIds.filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return [];
    }
    try {
      const docs = (await this.prisma.subscriptionNotification.findRaw({
        filter: { userId: { $in: ids.map((id) => ({ $oid: id })) } },
      })) as unknown as RawSubscriptionNotification[];
      return docs.map(fromRawSubscription);
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
