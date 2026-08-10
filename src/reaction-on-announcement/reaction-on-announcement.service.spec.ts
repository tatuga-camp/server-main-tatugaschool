import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ReactionOnAnnouncementService } from './reaction-on-announcement.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('ReactionOnAnnouncementService', () => {
  let service: ReactionOnAnnouncementService;

  const mockPrismaService = {
    announcement: { findUnique: jest.fn() },
    studentOnSubject: { findFirst: jest.fn() },
    reactionOnAnnouncement: {
      findRaw: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionOnAnnouncementService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<ReactionOnAnnouncementService>(
      ReactionOnAnnouncementService,
    );

    service['userRepository'] = {
      findById: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const announcement = { id: 'ann1', subjectId: 'subj1', schoolId: 'sch1' };
  const student = { id: 'st1', schoolId: 'sch1' } as any;
  const enrollment = {
    id: 'sos1',
    studentId: 'st1',
    firstName: 'Somchai',
    photo: 'p.png',
    isActive: true,
  };

  // findRaw returns EJSON documents
  const rawReaction = (emoji: string) => ({
    _id: { $oid: 'r1' },
    createAt: { $date: '2026-08-01T00:00:00.000Z' },
    updateAt: { $date: '2026-08-01T00:00:00.000Z' },
    emoji,
    firstName: 'Somchai',
    announcementId: { $oid: 'ann1' },
    subjectId: { $oid: 'subj1' },
    schoolId: { $oid: 'sch1' },
    studentId: { $oid: 'st1' },
  });

  it('adds a reaction when the student has none', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(enrollment);
    mockPrismaService.reactionOnAnnouncement.findRaw.mockResolvedValue([]);
    mockPrismaService.reactionOnAnnouncement.create.mockResolvedValue({
      id: 'r1',
      emoji: '👍',
    });

    const result = await service.toggleFromStudent(
      { announcementId: 'ann1', emoji: '👍' },
      student,
    );

    expect(result.action).toBe('added');
    expect(mockPrismaService.reactionOnAnnouncement.create).toHaveBeenCalledWith(
      {
        data: expect.objectContaining({
          emoji: '👍',
          announcementId: 'ann1',
          studentId: 'st1',
          firstName: 'Somchai',
        }),
      },
    );
  });

  it('removes the reaction when tapping the same emoji', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(enrollment);
    mockPrismaService.reactionOnAnnouncement.findRaw.mockResolvedValue([
      rawReaction('👍'),
    ]);
    mockPrismaService.reactionOnAnnouncement.delete.mockResolvedValue({
      id: 'r1',
    });

    const result = await service.toggleFromStudent(
      { announcementId: 'ann1', emoji: '👍' },
      student,
    );

    expect(result.action).toBe('removed');
    expect(result.reaction).toBeNull();
  });

  it('switches the reaction when tapping a different emoji', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(enrollment);
    mockPrismaService.reactionOnAnnouncement.findRaw.mockResolvedValue([
      rawReaction('👍'),
    ]);
    mockPrismaService.reactionOnAnnouncement.update.mockResolvedValue({
      id: 'r1',
      emoji: '❤️',
    });

    const result = await service.toggleFromStudent(
      { announcementId: 'ann1', emoji: '❤️' },
      student,
    );

    expect(result.action).toBe('switched');
    expect(
      mockPrismaService.reactionOnAnnouncement.update,
    ).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { emoji: '❤️' },
    });
  });

  // The lookup must use a plain (non-$expr) findRaw filter: studentId/userId
  // are optional, so a Prisma findFirst on them cannot use the announcementId
  // index.
  it('looks the student reaction up with a plain findRaw filter, limit 1', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(enrollment);
    mockPrismaService.reactionOnAnnouncement.findRaw.mockResolvedValue([]);
    mockPrismaService.reactionOnAnnouncement.create.mockResolvedValue({
      id: 'r1',
      emoji: '👍',
    });

    await service.toggleFromStudent(
      { announcementId: 'ann1', emoji: '👍' },
      student,
    );

    expect(mockPrismaService.reactionOnAnnouncement.findRaw).toHaveBeenCalledWith(
      {
        filter: {
          announcementId: { $oid: 'ann1' },
          studentId: { $oid: 'st1' },
        },
        options: { limit: 1 },
      },
    );
  });

  describe('toggleFromTeacher', () => {
    const user = { id: 'u1' } as any;
    const userInfo = { id: 'u1', firstName: 'Kru A', photo: 'u.png' };

    const rawTeacherReaction = (emoji: string) => ({
      _id: { $oid: 'r2' },
      createAt: { $date: '2026-08-01T00:00:00.000Z' },
      updateAt: { $date: '2026-08-01T00:00:00.000Z' },
      emoji,
      firstName: 'Kru A',
      announcementId: { $oid: 'ann1' },
      subjectId: { $oid: 'subj1' },
      schoolId: { $oid: 'sch1' },
      userId: { $oid: 'u1' },
    });

    beforeEach(() => {
      mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(undefined);
      (service['userRepository'].findById as jest.Mock).mockResolvedValue(
        userInfo,
      );
    });

    it('looks the teacher reaction up by userId with a plain findRaw filter', async () => {
      mockPrismaService.reactionOnAnnouncement.findRaw.mockResolvedValue([]);
      mockPrismaService.reactionOnAnnouncement.create.mockResolvedValue({
        id: 'r2',
        emoji: '👍',
      });

      const result = await service.toggleFromTeacher(
        { announcementId: 'ann1', emoji: '👍' },
        user,
      );

      expect(
        mockPrismaService.reactionOnAnnouncement.findRaw,
      ).toHaveBeenCalledWith({
        filter: {
          announcementId: { $oid: 'ann1' },
          userId: { $oid: 'u1' },
        },
        options: { limit: 1 },
      });
      expect(result.action).toBe('added');
      expect(
        mockPrismaService.reactionOnAnnouncement.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emoji: '👍',
          announcementId: 'ann1',
          userId: 'u1',
          firstName: 'Kru A',
        }),
      });
    });

    it('removes the teacher reaction using the id mapped out of the raw doc', async () => {
      mockPrismaService.reactionOnAnnouncement.findRaw.mockResolvedValue([
        rawTeacherReaction('👍'),
      ]);
      mockPrismaService.reactionOnAnnouncement.delete.mockResolvedValue({
        id: 'r2',
      });

      const result = await service.toggleFromTeacher(
        { announcementId: 'ann1', emoji: '👍' },
        user,
      );

      expect(result.action).toBe('removed');
      expect(
        mockPrismaService.reactionOnAnnouncement.delete,
      ).toHaveBeenCalledWith({ where: { id: 'r2' } });
    });
  });

  it('rejects a non-enrolled student', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(null);
    await expect(
      service.toggleFromStudent({ announcementId: 'ann1', emoji: '👍' }, student),
    ).rejects.toThrow(ForbiddenException);
  });
});
