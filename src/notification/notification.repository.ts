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
};

// --- 3. Implement the Repository Class ---

@Injectable()
export class NotificationRepository implements Repository {
  constructor(private prisma: PrismaService) {}

  async findById({ id }: RequestGetById): Promise<Notification | null> {
    return await this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async findManyForUser({
    userId,
  }: RequestGetForUser): Promise<Notification[]> {
    return await this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createAt: 'desc' },
      take: 20,
    });
  }

  async getUnreadCount({ userId }: RequestGetUnreadCount): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
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
    // Note: The return type for updateMany is BatchPayload
    return await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }
}
