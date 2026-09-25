import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PublicProgressService } from './public-progress.service';

const TOKEN = 'a'.repeat(32);
const user = { id: 'user-1' } as any;

function setup() {
  const prisma = {
    subject: { findUnique: jest.fn(), update: jest.fn(), findRaw: jest.fn() },
    assignment: { findMany: jest.fn().mockResolvedValue([]) },
    studentOnAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    gradeRange: { findUnique: jest.fn().mockResolvedValue(null) },
    scoreOnSubject: { findMany: jest.fn().mockResolvedValue([]) },
    scoreOnStudent: { findMany: jest.fn().mockResolvedValue([]) },
    studentOnSubject: { findMany: jest.fn().mockResolvedValue([]) },
  };
  prisma.subject.update.mockImplementation(({ data }) =>
    Promise.resolve({
      publicProgressToken: data.publicProgressToken ?? TOKEN,
      publicProgressLevel: data.publicProgressLevel ?? 'STATUS',
    }),
  );
  const teacherOnSubjectService = {
    ValidateAccess: jest.fn().mockResolvedValue({}),
  };
  const service = new PublicProgressService(
    prisma as any,
    teacherOnSubjectService as any,
  );
  return { prisma, teacherOnSubjectService, service };
}

describe('PublicProgressService', () => {
  describe('share', () => {
    it('mints a 32-char hex token when none exists and saves the level', async () => {
      const { prisma, service, teacherOnSubjectService } = setup();
      prisma.subject.findUnique.mockResolvedValue({ publicProgressToken: null });
      const result = await service.share({ subjectId: 's1', level: 'SCORE' }, user);
      expect(teacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({ userId: 'user-1', subjectId: 's1' });
      expect(result.token).toMatch(/^[a-f0-9]{32}$/);
      expect(result.level).toBe('SCORE');
      expect(prisma.subject.update.mock.calls[0][0].data.publicProgressLevel).toBe('SCORE');
    });

    it('keeps an existing token', async () => {
      const { prisma, service } = setup();
      prisma.subject.findUnique.mockResolvedValue({ publicProgressToken: TOKEN });
      const result = await service.share({ subjectId: 's1', level: 'GRADE' }, user);
      expect(result.token).toBe(TOKEN);
    });

    it('re-sharing after revoke mints a different token', async () => {
      const { prisma, service } = setup();
      prisma.subject.findUnique.mockResolvedValue({ publicProgressToken: null });
      const first = await service.share({ subjectId: 's1', level: 'STATUS' }, user);
      const second = await service.share({ subjectId: 's1', level: 'STATUS' }, user);
      expect(first.token).not.toBe(second.token);
    });

    it('does not write when access is denied', async () => {
      const { prisma, service, teacherOnSubjectService } = setup();
      teacherOnSubjectService.ValidateAccess.mockRejectedValue(new ForbiddenException());
      await expect(service.share({ subjectId: 's1', level: 'STATUS' }, user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.subject.update).not.toHaveBeenCalled();
    });

    it('404s for a missing subject', async () => {
      const { prisma, service } = setup();
      prisma.subject.findUnique.mockResolvedValue(null);
      await expect(service.share({ subjectId: 's1', level: 'STATUS' }, user)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateLevel', () => {
    it('404s when the link is off', async () => {
      const { prisma, service } = setup();
      prisma.subject.findUnique.mockResolvedValue({ publicProgressToken: null });
      await expect(service.updateLevel({ subjectId: 's1', level: 'GRADE' }, user)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subject.update).not.toHaveBeenCalled();
    });

    it('changes only the level', async () => {
      const { prisma, service } = setup();
      prisma.subject.findUnique.mockResolvedValue({ publicProgressToken: TOKEN });
      const result = await service.updateLevel({ subjectId: 's1', level: 'GRADE' }, user);
      expect(prisma.subject.update.mock.calls[0][0].data).toEqual({ publicProgressLevel: 'GRADE' });
      expect(result).toEqual({ token: TOKEN, level: 'GRADE' });
    });
  });

  describe('revoke', () => {
    it('clears the token', async () => {
      const { prisma, service } = setup();
      prisma.subject.update.mockResolvedValue({ publicProgressToken: null, publicProgressLevel: 'SCORE' });
      const result = await service.revoke({ subjectId: 's1' }, user);
      expect(prisma.subject.update.mock.calls[0][0].data).toEqual({ publicProgressToken: null });
      expect(result).toEqual({ token: null, level: 'SCORE' });
    });
  });

  describe('getByToken', () => {
    it('rejects an empty token without querying', async () => {
      const { prisma, service } = setup();
      await expect(service.getByToken('')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subject.findRaw).not.toHaveBeenCalled();
    });

    it('404s for an unknown token', async () => {
      const { prisma, service } = setup();
      prisma.subject.findRaw.mockResolvedValue([]);
      await expect(service.getByToken(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s for a deleted subject', async () => {
      const { prisma, service } = setup();
      prisma.subject.findRaw.mockResolvedValue([{ _id: { $oid: 's1' } }]);
      prisma.subject.findUnique.mockResolvedValue({ id: 's1', isDeleted: true, publicProgressToken: TOKEN, class: { title: 'M.1' } });
      await expect(service.getByToken(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the token was rotated between lookup and load', async () => {
      const { prisma, service } = setup();
      prisma.subject.findRaw.mockResolvedValue([{ _id: { $oid: 's1' } }]);
      prisma.subject.findUnique.mockResolvedValue({ id: 's1', isDeleted: false, publicProgressToken: 'b'.repeat(32), class: { title: 'M.1' } });
      await expect(service.getByToken(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the built payload at the stored level', async () => {
      const { prisma, service } = setup();
      prisma.subject.findRaw.mockResolvedValue([{ _id: { $oid: 's1' } }]);
      prisma.subject.findUnique.mockResolvedValue({
        id: 's1', title: 'Math', educationYear: '1/2026', isDeleted: false,
        publicProgressToken: TOKEN, publicProgressLevel: 'SCORE', class: { title: 'M.1/2' },
      });
      const result = await service.getByToken(TOKEN);
      expect(result.level).toBe('SCORE');
      expect(result.subject).toEqual({ title: 'Math', educationYear: '1/2026', className: 'M.1/2' });
      expect(prisma.subject.findRaw).toHaveBeenCalledWith({
        filter: { publicProgressToken: TOKEN },
        options: { limit: 1, projection: { _id: 1 } },
      });
    });
  });
});
