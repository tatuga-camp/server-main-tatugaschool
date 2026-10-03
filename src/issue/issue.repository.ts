import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { IssueGroup, IssueReport, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

type Repository = {
  findManyGroups(args: Prisma.IssueGroupFindManyArgs): Promise<IssueGroup[]>;
  countGroups(args: Prisma.IssueGroupCountArgs): Promise<number>;
  findGroupById(id: string): Promise<IssueGroup | null>;
  updateGroup(args: Prisma.IssueGroupUpdateArgs): Promise<IssueGroup>;
  findManyReports(args: Prisma.IssueReportFindManyArgs): Promise<IssueReport[]>;
  countReports(args: Prisma.IssueReportCountArgs): Promise<number>;
};

@Injectable()
export class IssueRepository implements Repository {
  private readonly logger = new Logger(IssueRepository.name);

  constructor(private prisma: PrismaService) {}

  private async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
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

  findManyGroups(args: Prisma.IssueGroupFindManyArgs): Promise<IssueGroup[]> {
    return this.run(() => this.prisma.issueGroup.findMany(args));
  }

  countGroups(args: Prisma.IssueGroupCountArgs): Promise<number> {
    return this.run(() => this.prisma.issueGroup.count(args));
  }

  findGroupById(id: string): Promise<IssueGroup | null> {
    return this.run(() => this.prisma.issueGroup.findUnique({ where: { id } }));
  }

  updateGroup(args: Prisma.IssueGroupUpdateArgs): Promise<IssueGroup> {
    return this.run(() => this.prisma.issueGroup.update(args));
  }

  findManyReports(
    args: Prisma.IssueReportFindManyArgs,
  ): Promise<IssueReport[]> {
    return this.run(() => this.prisma.issueReport.findMany(args));
  }

  countReports(args: Prisma.IssueReportCountArgs): Promise<number> {
    return this.run(() => this.prisma.issueReport.count(args));
  }
}
