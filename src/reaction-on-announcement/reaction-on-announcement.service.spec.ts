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
      findFirst: jest.fn(),
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

  it('adds a reaction when the student has none', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(enrollment);
    mockPrismaService.reactionOnAnnouncement.findFirst.mockResolvedValue(null);
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
    mockPrismaService.reactionOnAnnouncement.findFirst.mockResolvedValue({
      id: 'r1',
      emoji: '👍',
    });
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
    mockPrismaService.reactionOnAnnouncement.findFirst.mockResolvedValue({
      id: 'r1',
      emoji: '👍',
    });
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

  it('rejects a non-enrolled student', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(null);
    await expect(
      service.toggleFromStudent({ announcementId: 'ann1', emoji: '👍' }, student),
    ).rejects.toThrow(ForbiddenException);
  });
});
