import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IssueGroup, IssueStatus, Prisma, User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from '../users/users.repository';
import { CreateIssueReportDto } from './dto/create-issue-report.dto';
import { QueryIssueReportsDto } from './dto/query-issue-reports.dto';
import { IssueStatusFilter, QueryIssuesDto } from './dto/query-issues.dto';
import { UpdateIssueStatusDto } from './dto/update-issue-status.dto';
import { computeFingerprint } from './fingerprint';
import { IssueRepository } from './issue.repository';

type Reporter = { userId?: string; userEmail?: string };

const REPORTER_SELECT = {
  user: {
    select: { firstName: true, lastName: true, email: true, photo: true },
  },
} as const;

@Injectable()
export class IssueService {
  private readonly logger = new Logger(IssueService.name);
  private userRepository: UserRepository;

  constructor(
    private issueRepository: IssueRepository,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.userRepository = new UserRepository(this.prisma);
  }

  /**
   * Optional auth for the public report endpoint. Any failure (no header,
   * bad or expired token, unknown user) yields an anonymous reporter; it never
   * throws, so a crashed signed-out page can still report.
   */
  private async resolveReporter(authorization?: string): Promise<Reporter> {
    if (!authorization || !authorization.startsWith('Bearer ')) return {};
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) return {};
    try {
      const payload = this.jwtService.verify<UserJwtPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      if (!payload?.id) return {};
      const user = await this.userRepository.findById({ id: payload.id });
      if (!user) return {};
      return { userId: user.id, userEmail: user.email };
    } catch {
      this.logger.warn('Ignoring invalid bearer token on issue report');
      return {};
    }
  }

  async createReport(
    dto: CreateIssueReportDto,
    authorization?: string,
  ): Promise<{ reportId: string; groupId: string }> {
    const reporter = await this.resolveReporter(authorization);
    const fingerprint = computeFingerprint(dto);
    const capturedAt = new Date(dto.capturedAt);

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.issueGroup.upsert({
        where: { fingerprint },
        create: {
          fingerprint,
          status: IssueStatus.OPEN,
          errorName: dto.errorName,
          message: dto.message,
          samplePageUrl: dto.pageUrl,
          sampleStack: dto.stack,
          sampleComponentStack: dto.componentStack,
          count: 1,
          affectedUserCount: reporter.userId ? 1 : 0,
          firstSeenAt: capturedAt,
          lastSeenAt: capturedAt,
        },
        update: {
          status: IssueStatus.OPEN,
          resolvedAt: null,
          resolvedByUserId: null,
          errorName: dto.errorName,
          message: dto.message,
          samplePageUrl: dto.pageUrl,
          sampleStack: dto.stack,
          sampleComponentStack: dto.componentStack,
          count: { increment: 1 },
          lastSeenAt: capturedAt,
        },
      });

      const report = await tx.issueReport.create({
        data: {
          groupId: group.id,
          fingerprint,
          errorName: dto.errorName,
          message: dto.message,
          stack: dto.stack,
          componentStack: dto.componentStack,
          pageUrl: dto.pageUrl,
          userAgent: dto.userAgent,
          capturedAt,
          userId: reporter.userId ?? null,
          userEmail: reporter.userEmail ?? null,
        },
      });

      if (reporter.userId) {
        // groupBy + filter in code: a `userId: { not: null }` filter on an
        // optional field becomes a non-indexable $expr on this Mongo setup.
        const users = await tx.issueReport.groupBy({
          by: ['userId'],
          where: { groupId: group.id },
        });
        const affectedUserCount = users.filter((u) => u.userId !== null).length;
        await tx.issueGroup.update({
          where: { id: group.id },
          data: { affectedUserCount },
        });
      }

      return { reportId: report.id, groupId: group.id };
    });
  }

  private async assertAdmin(user: UserJwtPayload): Promise<User> {
    const info = await this.userRepository.findById({ id: user.id });
    if (!info || info.role !== 'ADMIN') {
      throw new ForbiddenException('Access deny');
    }
    return info;
  }

  async findAll(query: QueryIssuesDto, user: UserJwtPayload) {
    await this.assertAdmin(user);
    const {
      status = IssueStatusFilter.OPEN,
      search,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.IssueGroupWhereInput = {
      ...(status !== IssueStatusFilter.ALL && {
        status: status as unknown as IssueStatus,
      }),
      ...(search && {
        OR: [
          { errorName: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, items, open, resolved] = await Promise.all([
      this.issueRepository.countGroups({ where }),
      this.issueRepository.findManyGroups({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastSeenAt: 'desc' },
      }),
      this.issueRepository.countGroups({ where: { status: IssueStatus.OPEN } }),
      this.issueRepository.countGroups({
        where: { status: IssueStatus.RESOLVED },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts: { open, resolved },
    };
  }

  async findOne(
    groupId: string,
    query: QueryIssueReportsDto,
    user: UserJwtPayload,
  ) {
    await this.assertAdmin(user);
    const group = await this.issueRepository.findGroupById(groupId);
    if (!group) throw new NotFoundException('Issue not found');

    const { page = 1, limit = 20 } = query;
    const [total, items] = await Promise.all([
      this.issueRepository.countReports({ where: { groupId } }),
      this.issueRepository.findManyReports({
        where: { groupId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createAt: 'desc' },
        include: REPORTER_SELECT,
      }),
    ]);

    return {
      group,
      reports: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(
    groupId: string,
    dto: UpdateIssueStatusDto,
    user: UserJwtPayload,
  ): Promise<IssueGroup> {
    const admin = await this.assertAdmin(user);
    const group = await this.issueRepository.findGroupById(groupId);
    if (!group) throw new NotFoundException('Issue not found');

    const data: Prisma.IssueGroupUpdateInput =
      dto.status === IssueStatus.RESOLVED
        ? {
            status: IssueStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedByUserId: admin.id,
          }
        : { status: IssueStatus.OPEN, resolvedAt: null, resolvedByUserId: null };

    return this.issueRepository.updateGroup({ where: { id: groupId }, data });
  }
}
