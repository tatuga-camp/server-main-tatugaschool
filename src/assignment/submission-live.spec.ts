import { NotFoundException } from '@nestjs/common';
import { assertSubmissionLive } from './submission-live';

const prismaWith = (row: unknown) =>
  ({
    studentOnAssignment: { findUnique: jest.fn().mockResolvedValue(row) },
  }) as never;

describe('assertSubmissionLive', () => {
  it('passes for a live assignment', async () => {
    await expect(
      assertSubmissionLive(
        prismaWith({ id: 's', assignment: { isDeleted: false } }),
        's',
      ),
    ).resolves.toBeUndefined();
  });
  it('404s when the submission is missing', async () => {
    await expect(assertSubmissionLive(prismaWith(null), 's')).rejects.toThrow(
      NotFoundException,
    );
  });
  it('404s when the assignment was soft-deleted', async () => {
    await expect(
      assertSubmissionLive(
        prismaWith({ id: 's', assignment: { isDeleted: true } }),
        's',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
