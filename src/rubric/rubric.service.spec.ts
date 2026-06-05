import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
    deleteCascade: jest.fn().mockResolvedValue(undefined),
    replaceCriteria: jest.fn().mockResolvedValue({ id: 'r1' }),
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

  it('throws NotFoundException on create when the subject does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.subject.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        { title: 'R', subjectId: 'missing', criteria: [] } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a rubric via deleteCascade when it is unused', async () => {
    const { service } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    (service as any).repo.countAssignmentsUsing.mockResolvedValue(0);
    const result = await service.delete(
      { rubricId: 'r1' } as any,
      { id: 'u1' } as any,
    );
    expect((service as any).repo.deleteCascade).toHaveBeenCalledWith('r1');
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

describe('RubricService.gradeStudent', () => {
  function gradingService() {
    const prisma: any = {
      subject: { findUnique: jest.fn().mockResolvedValue(subject) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
      rubricScoreOnStudentAssignment: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      studentOnAssignment: { update: jest.fn().mockResolvedValue({ id: 'soa1' }) },
    };
    const teacher: any = { ValidateAccess: jest.fn().mockResolvedValue(true) };
    const ai: any = {};
    const service = new RubricService(prisma, teacher, ai);
    (service as any).repo = {
      getStudentOnAssignment: jest.fn().mockResolvedValue({
        id: 'soa1',
        assignmentId: 'a1',
        subjectId: 'sub1',
        schoolId: 'school1',
      }),
    };
    (service as any).loadAssignmentRubric = jest.fn().mockResolvedValue({
      maxScore: 10,
      criteria: [
        {
          id: 'c1',
          weight: 1,
          levels: [
            { id: 'l-lo', points: 1 },
            { id: 'l-hi', points: 4 },
          ],
        },
      ],
    });
    return { service, prisma, teacher };
  }

  it('rejects an item whose criterion is not in the assignment rubric', async () => {
    const { service } = gradingService();
    await expect(
      service.gradeStudent(
        {
          studentOnAssignmentId: 'soa1',
          items: [{ criterionId: 'XXX', selectedLevelId: 'l-hi' }],
        } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes and writes the normalized score with status REVIEWD', async () => {
    const { service, prisma } = gradingService();
    await service.gradeStudent(
      {
        studentOnAssignmentId: 'soa1',
        items: [{ criterionId: 'c1', selectedLevelId: 'l-hi' }],
      } as any,
      { id: 'u1' } as any,
    );
    expect(prisma.studentOnAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ score: 10, status: 'REVIEWD' }),
      }),
    );
  });
});
