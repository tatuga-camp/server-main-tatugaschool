import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueReportDto } from './dto/create-issue-report.dto';
import { IssueStatusFilter } from './dto/query-issues.dto';
import { IssueRepository } from './issue.repository';
import { IssueService } from './issue.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('IssueService', () => {
  let service: IssueService;

  const tx = {
    issueGroup: { upsert: jest.fn(), update: jest.fn() },
    issueReport: { create: jest.fn(), groupBy: jest.fn() },
  };
  const mockPrisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const mockRepo = {
    findManyGroups: jest.fn(),
    countGroups: jest.fn(),
    findGroupById: jest.fn(),
    updateGroup: jest.fn(),
    findManyReports: jest.fn(),
    countReports: jest.fn(),
  };
  const mockJwt = { verify: jest.fn() };
  const mockConfig = { get: jest.fn().mockReturnValue('access-secret') };
  const userRepository = { findById: jest.fn() };

  const dto: CreateIssueReportDto = {
    errorName: 'TypeError',
    message: 'boom 1',
    stack: 'TypeError: boom\n    at Page (a.js:1:1)',
    componentStack: '\n    at Page',
    pageUrl: 'http://localhost:8181/subject/1',
    userAgent: 'UA',
    capturedAt: '2026-09-24T10:00:00.000Z',
  };
  const adminJwt = { id: 'u-admin', email: 'a@a.com', isVerifyEmail: true };
  const userJwt = { id: 'u-user', email: 'u@a.com', isVerifyEmail: true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IssueRepository, useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(IssueService);
    (service as any).userRepository = userRepository;

    tx.issueGroup.upsert.mockResolvedValue({ id: 'g1' });
    tx.issueReport.create.mockResolvedValue({ id: 'r1' });
    tx.issueReport.groupBy.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createReport', () => {
    it('stores anonymously when there is no authorization header', async () => {
      const result = await service.createReport(dto, undefined);

      expect(result).toEqual({ reportId: 'r1', groupId: 'g1' });
      expect(mockJwt.verify).not.toHaveBeenCalled();
      expect(tx.issueReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null, userEmail: null }),
        }),
      );
      expect(tx.issueGroup.update).not.toHaveBeenCalled();
    });

    it('stores anonymously and does not throw when the token is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.createReport(dto, 'Bearer bad.token.here'),
      ).resolves.toEqual({ reportId: 'r1', groupId: 'g1' });
      expect(tx.issueReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null, userEmail: null }),
        }),
      );
    });

    it('attaches the user and recounts distinct users when the token is valid', async () => {
      mockJwt.verify.mockReturnValue({ id: 'u-user' });
      userRepository.findById.mockResolvedValue({
        id: 'u-user',
        email: 'current@a.com',
      });
      tx.issueReport.groupBy.mockResolvedValue([
        { userId: 'u-user' },
        { userId: 'u-other' },
        { userId: null },
      ]);

      await service.createReport(dto, 'Bearer good');

      expect(mockJwt.verify).toHaveBeenCalledWith('good', {
        secret: 'access-secret',
      });
      expect(tx.issueReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u-user',
            userEmail: 'current@a.com',
          }),
        }),
      );
      expect(tx.issueReport.groupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: { groupId: 'g1' },
      });
      expect(tx.issueGroup.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { affectedUserCount: 2 },
      });
    });

    it('creates the group with count 1 and first = last seen, and on update increments and reopens', async () => {
      await service.createReport(dto, undefined);

      const args = tx.issueGroup.upsert.mock.calls[0][0];
      expect(args.where).toEqual({ fingerprint: expect.any(String) });
      expect(args.create).toEqual(
        expect.objectContaining({
          count: 1,
          affectedUserCount: 0,
          status: 'OPEN',
          firstSeenAt: new Date(dto.capturedAt),
          lastSeenAt: new Date(dto.capturedAt),
          errorName: 'TypeError',
          sampleStack: dto.stack,
        }),
      );
      expect(args.update).toEqual(
        expect.objectContaining({
          count: { increment: 1 },
          status: 'OPEN',
          resolvedAt: null,
          resolvedByUserId: null,
          lastSeenAt: new Date(dto.capturedAt),
        }),
      );
      expect(args.update.firstSeenAt).toBeUndefined();
    });

    it('uses the same fingerprint for messages that differ only by ids', async () => {
      await service.createReport(dto, undefined);
      await service.createReport({ ...dto, message: 'boom 2' }, undefined);

      const [first, second] = tx.issueGroup.upsert.mock.calls;
      expect(first[0].where.fingerprint).toBe(second[0].where.fingerprint);
    });
  });

  describe('admin guard', () => {
    it('findAll, findOne and updateStatus reject non-admins', async () => {
      userRepository.findById.mockResolvedValue({ id: 'u-user', role: 'USER' });

      await expect(service.findAll({}, userJwt)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.findOne('g1', {}, userJwt)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.updateStatus('g1', { status: 'RESOLVED' }, userJwt),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      userRepository.findById.mockResolvedValue({
        id: 'u-admin',
        role: 'ADMIN',
      });
      mockRepo.countGroups
        .mockResolvedValueOnce(45) // total for filter
        .mockResolvedValueOnce(40) // open
        .mockResolvedValueOnce(5); // resolved
      mockRepo.findManyGroups.mockResolvedValue([{ id: 'g1' }]);
    });

    it('defaults to OPEN, pages, and returns global counts', async () => {
      const result = await service.findAll({ page: 2, limit: 20 }, adminJwt);

      expect(mockRepo.findManyGroups).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
        skip: 20,
        take: 20,
        orderBy: { lastSeenAt: 'desc' },
      });
      expect(result).toEqual({
        items: [{ id: 'g1' }],
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
        counts: { open: 40, resolved: 5 },
      });
    });

    it('drops the status filter for ALL and adds a case-insensitive search', async () => {
      await service.findAll(
        { status: IssueStatusFilter.ALL, search: 'undefined' },
        adminJwt,
      );

      expect(mockRepo.findManyGroups.mock.calls[0][0].where).toEqual({
        OR: [
          { errorName: { contains: 'undefined', mode: 'insensitive' } },
          { message: { contains: 'undefined', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      userRepository.findById.mockResolvedValue({
        id: 'u-admin',
        role: 'ADMIN',
      });
    });

    it('throws NotFound for a missing group', async () => {
      mockRepo.findGroupById.mockResolvedValue(null);
      await expect(service.findOne('nope', {}, adminJwt)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the group and paginated reports with reporter info', async () => {
      mockRepo.findGroupById.mockResolvedValue({ id: 'g1' });
      mockRepo.countReports.mockResolvedValue(1);
      mockRepo.findManyReports.mockResolvedValue([{ id: 'r1' }]);

      const result = await service.findOne('g1', { page: 1, limit: 10 }, adminJwt);

      expect(mockRepo.findManyReports).toHaveBeenCalledWith({
        where: { groupId: 'g1' },
        skip: 0,
        take: 10,
        orderBy: { createAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true, photo: true },
          },
        },
      });
      expect(result).toEqual({
        group: { id: 'g1' },
        reports: { items: [{ id: 'r1' }], total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      userRepository.findById.mockResolvedValue({
        id: 'u-admin',
        role: 'ADMIN',
      });
      mockRepo.findGroupById.mockResolvedValue({ id: 'g1' });
      mockRepo.updateGroup.mockImplementation(async (args) => ({
        id: 'g1',
        ...args.data,
      }));
    });

    it('RESOLVED stamps resolvedAt and the admin id', async () => {
      const result = await service.updateStatus(
        'g1',
        { status: 'RESOLVED' },
        adminJwt,
      );

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedByUserId).toBe('u-admin');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('OPEN clears the resolved fields', async () => {
      await service.updateStatus('g1', { status: 'OPEN' }, adminJwt);

      expect(mockRepo.updateGroup).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { status: 'OPEN', resolvedAt: null, resolvedByUserId: null },
      });
    });

    it('throws NotFound for a missing group', async () => {
      mockRepo.findGroupById.mockResolvedValue(null);
      await expect(
        service.updateStatus('nope', { status: 'OPEN' }, adminJwt),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
