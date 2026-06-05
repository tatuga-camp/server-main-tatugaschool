import { ForbiddenException } from '@nestjs/common';
import { RubricService } from './rubric.service';

const subject = { id: 'sub1', schoolId: 'school1' };

function makeService() {
  const prisma: any = {
    subject: { findUnique: jest.fn().mockResolvedValue(subject) },
  };
  const teacher: any = { ValidateAccess: jest.fn().mockResolvedValue(true) };
  const ai: any = { generateContent: jest.fn(), summarizeFile: jest.fn() };
  const service = new RubricService(prisma, teacher, ai);
  (service as any).repo = {
    createFull: jest.fn().mockResolvedValue({ id: 'r1' }),
    findManyBySubject: jest.fn().mockResolvedValue([]),
    findByIdWithTree: jest.fn(),
    countAssignmentsUsing: jest.fn().mockResolvedValue(0),
    deleteCriteriaTree: jest.fn().mockResolvedValue(undefined),
    deleteCascade: jest.fn().mockResolvedValue(undefined),
    updateRubricWithCriteria: jest.fn().mockResolvedValue({ id: 'r1' }),
  };
  return { service, prisma, teacher };
}

describe('RubricService CRUD', () => {
  it('creates a rubric after validating teacher access', async () => {
    const { service, teacher } = makeService();
    const user: any = { id: 'u1' };
    const result = await service.create(
      {
        title: 'R',
        subjectId: 'sub1',
        criteria: [
          {
            title: 'C1',
            weight: 1,
            order: 0,
            levels: [
              { title: 'Good', points: 2, order: 0 },
              { title: 'Bad', points: 1, order: 1 },
            ],
          },
        ],
      } as any,
      user,
    );
    expect(teacher.ValidateAccess).toHaveBeenCalledWith({
      userId: 'u1',
      subjectId: 'sub1',
    });
    expect(result).toEqual({ id: 'r1' });
  });

  it('blocks delete when the rubric is attached to an assignment', async () => {
    const { service } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    (service as any).repo.countAssignmentsUsing.mockResolvedValue(2);
    await expect(
      service.delete({ rubricId: 'r1' } as any, { id: 'u1' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
