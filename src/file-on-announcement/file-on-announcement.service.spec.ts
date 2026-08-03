import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileOnAnnouncementService } from './file-on-announcement.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StorageService } from '../storage/storage.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('FileOnAnnouncementService', () => {
  let service: FileOnAnnouncementService;

  const mockPrismaService = {
    announcement: { findUnique: jest.fn() },
    fileOnAnnouncement: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    school: { update: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockStorageService = {
    DeleteFileOnStorage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileOnAnnouncementService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<FileOnAnnouncementService>(FileOnAnnouncementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const teacher = { id: 'u1', email: 't@t.com' } as any;
  const announcement = { id: 'ann1', subjectId: 'subj1', schoolId: 'sch1' };

  it('creates a file row and increments school storage', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
    mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
    mockPrismaService.fileOnAnnouncement.create.mockResolvedValue({
      id: 'f1',
      size: 1234,
      schoolId: 'sch1',
    });

    const result = await service.create(
      {
        announcementId: 'ann1',
        url: 'https://r2/x.pdf',
        size: 1234,
        type: 'application/pdf',
        name: 'x.pdf',
      },
      teacher,
    );

    expect(result.id).toBe('f1');
    expect(mockPrismaService.school.update).toHaveBeenCalledWith({
      where: { id: 'sch1' },
      data: { totalStorage: { increment: 1234 } },
    });
  });

  it('deletes a file row, decrements storage, and removes the R2 object when last reference', async () => {
    mockPrismaService.fileOnAnnouncement.findUnique.mockResolvedValue({
      id: 'f1',
      url: 'https://r2/x.pdf',
      size: 1234,
      type: 'application/pdf',
      announcementId: 'ann1',
      subjectId: 'subj1',
      schoolId: 'sch1',
    });
    mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
    // Post-delete state: the row itself is gone, so no other rows share the url.
    mockPrismaService.fileOnAnnouncement.findMany.mockResolvedValue([]);
    mockStorageService.DeleteFileOnStorage.mockResolvedValue(undefined);

    await service.delete({ fileOnAnnouncementId: 'f1' }, teacher);

    expect(mockPrismaService.fileOnAnnouncement.delete).toHaveBeenCalledWith({
      where: { id: 'f1' },
    });
    expect(mockStorageService.DeleteFileOnStorage).toHaveBeenCalledWith({
      fileName: 'https://r2/x.pdf',
    });
    expect(mockPrismaService.school.update).toHaveBeenCalledWith({
      where: { id: 'sch1' },
      data: { totalStorage: { decrement: 1234 } },
    });
  });

  it('keeps the R2 object and still decrements storage when another row still references the url', async () => {
    mockPrismaService.fileOnAnnouncement.findUnique.mockResolvedValue({
      id: 'f1',
      url: 'https://r2/x.pdf',
      size: 1234,
      type: 'application/pdf',
      announcementId: 'ann1',
      subjectId: 'subj1',
      schoolId: 'sch1',
    });
    mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
    // Post-delete state: another row (f2) still references the same url.
    mockPrismaService.fileOnAnnouncement.findMany.mockResolvedValue([
      { id: 'f2', url: 'https://r2/x.pdf' },
    ]);
    mockStorageService.DeleteFileOnStorage.mockResolvedValue(undefined);

    await service.delete({ fileOnAnnouncementId: 'f1' }, teacher);

    expect(mockPrismaService.fileOnAnnouncement.delete).toHaveBeenCalledWith({
      where: { id: 'f1' },
    });
    expect(mockStorageService.DeleteFileOnStorage).not.toHaveBeenCalled();
    expect(mockPrismaService.school.update).toHaveBeenCalledWith({
      where: { id: 'sch1' },
      data: { totalStorage: { decrement: 1234 } },
    });
  });

  it('throws NotFound for a missing announcement on create', async () => {
    mockPrismaService.announcement.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        { announcementId: 'nope', url: 'https://r2/x', size: 1 },
        teacher,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
