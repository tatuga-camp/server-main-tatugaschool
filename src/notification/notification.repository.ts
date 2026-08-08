import { Injectable } from '@nestjs/common';
import { Prisma, Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// --- 1. Define Request/Parameter Types ---
// We define simple types for each method's parameters,
// following the pattern you provided.

export type RequestGetById = {
  id: string;
};

export type RequestGetForUser = {
  userId: string;
};

export type RequestGetUnreadCount = {
  userId: string;
};

export type RequestCreate = {
  data: Prisma.NotificationCreateInput;
};

export type RequestCreateMany = {
  data: Prisma.NotificationCreateManyInput[];
};

export type RequestMarkAsRead = {
  id: string;
};

export type RequestMarkAllAsRead = {
  userId: string;
};

export type RequestGetForStudent = {
  studentId: string;
};

export type RequestMarkAllAsReadForStudent = {
  studentId: string;
};

// --- 2. Define the Repository Interface ---
// This interface defines the "contract" that our class must follow.

export type Repository = {
  findById(request: RequestGetById): Promise<Notification | null>;
  findManyForUser(request: RequestGetForUser): Promise<Notification[]>;
  getUnreadCount(request: RequestGetUnreadCount): Promise<number>;
  create(request: RequestCreate): Promise<Notification>;
  createMany(request: RequestCreateMany): Promise<Prisma.BatchPayload>;
  markAsRead(request: RequestMarkAsRead): Promise<Notification>;
  markAllAsRead(request: RequestMarkAllAsRead): Promise<Prisma.BatchPayload>;
  findManyForStudent(request: RequestGetForStudent): Promise<Notification[]>;
  markAllAsReadForStudent(
    request: RequestMarkAllAsReadForStudent,
  ): Promise<Prisma.BatchPayload>;
};

// --- 3. Implement the Repository Class ---

// Prisma's MongoDB connector translates `where` into `$match: { $expr: ... }`
// with `$ne: [field, "$$REMOVE"]` guards, which MongoDB cannot serve from the
// { userId/studentId, isRead } indexes ($ne inside $expr is never
// index-eligible) — in production this scanned the entire createAt index
// (~179k keys) on every poll. The hot filtered paths below therefore use
// findRaw/$runCommandRaw with plain filters, which do use those indexes.

type RawObjectId = { $oid: string };
type RawDate = { $date: string | { $numberLong: string } };

type RawNotification = {
  _id: RawObjectId;
  createAt: RawDate;
  userId?: RawObjectId | null;
  studentId?: RawObjectId | null;
  actorName: string;
  actorId: RawObjectId;
  actorImage: string;
  type: Notification['type'];
  message: string;
  link: string;
  isRead: boolean;
  schoolId: RawObjectId;
  subjectId: RawObjectId;
};

function fromRawDate(value: RawDate): Date {
  return typeof value.$date === 'string'
    ? new Date(value.$date)
    : new Date(Number(value.$date.$numberLong));
}

function fromRawNotification(doc: RawNotification): Notification {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    userId: doc.userId?.$oid ?? null,
    studentId: doc.studentId?.$oid ?? null,
    actorName: doc.actorName,
    actorId: doc.actorId.$oid,
    actorImage: doc.actorImage,
    type: doc.type,
    message: doc.message,
    link: doc.link,
    isRead: doc.isRead,
    schoolId: doc.schoolId.$oid,
    subjectId: doc.subjectId.$oid,
  };
}

@Injectable()
export class NotificationRepository implements Repository {
  constructor(private prisma: PrismaService) {}

  private async findManyUnreadRaw(
    filter: Prisma.InputJsonObject,
  ): Promise<Notification[]> {
    const docs = (await this.prisma.notification.findRaw({
      filter,
      options: { sort: { createAt: -1 }, limit: 99 },
    })) as unknown as RawNotification[];
    return docs.map(fromRawNotification);
  }

  private async markAllAsReadRaw(
    filter: Prisma.InputJsonObject,
  ): Promise<Prisma.BatchPayload> {
    const result = (await this.prisma.$runCommandRaw({
      update: 'Notification',
      updates: [
        {
          q: filter,
          u: { $set: { isRead: true } },
          multi: true,
        },
      ],
    })) as { nModified?: number };
    return { count: result.nModified ?? 0 };
  }

  async findById({ id }: RequestGetById): Promise<Notification | null> {
    return await this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async findManyForUser({
    userId,
  }: RequestGetForUser): Promise<Notification[]> {
    return await this.findManyUnreadRaw({
      userId: { $oid: userId },
      isRead: false,
    });
  }

  async getUnreadCount({ userId }: RequestGetUnreadCount): Promise<number> {
    const result = (await this.prisma.$runCommandRaw({
      count: 'Notification',
      query: { userId: { $oid: userId }, isRead: false },
    })) as { n?: number };
    return result.n ?? 0;
  }

  async create({ data }: RequestCreate): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  async createMany({ data }: RequestCreateMany): Promise<Prisma.BatchPayload> {
    // Note: The return type for createMany is BatchPayload
    return await this.prisma.notification.createMany({
      data,
    });
  }

  async markAsRead({ id }: RequestMarkAsRead): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead({
    userId,
  }: RequestMarkAllAsRead): Promise<Prisma.BatchPayload> {
    return await this.markAllAsReadRaw({
      userId: { $oid: userId },
      isRead: false,
    });
  }

  async findManyForStudent({
    studentId,
  }: RequestGetForStudent): Promise<Notification[]> {
    return await this.findManyUnreadRaw({
      studentId: { $oid: studentId },
      isRead: false,
    });
  }

  async markAllAsReadForStudent({
    studentId,
  }: RequestMarkAllAsReadForStudent): Promise<Prisma.BatchPayload> {
    return await this.markAllAsReadRaw({
      studentId: { $oid: studentId },
      isRead: false,
    });
  }
}
